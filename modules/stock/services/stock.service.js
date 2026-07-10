const mongoose = require("mongoose");
const StockItem = require("../models/stock-item.model");
const Product = require("../models/product.model");
const StockMovement = require("../models/stock-movement.model");
const Depot = require("../models/depot.model");

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  if (!id) return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return true;
};

exports.getOrCreateStockItem = async (productId) => {
  // Validate productId format
  if (!isValidObjectId(productId)) {
    throw Object.assign(new Error("Invalid product ID format"), { statusCode: 400 });
  }

  let stockItem = await StockItem.findOne({ productId });

  if (!stockItem) {
    const product = await Product.findById(productId);
    if (!product) {
      throw Object.assign(new Error("Product not found"), { statusCode: 404 });
    }

    stockItem = await StockItem.create({
      productId,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      status: "ACTIVE",
    });
  }

  return stockItem;
};

exports.getStockItemByProductId = async (productId) => {
  // Validate productId format
  if (!isValidObjectId(productId)) {
    throw Object.assign(new Error("Invalid product ID format"), { statusCode: 400 });
  }

  const stockItem = await StockItem.findOne({ productId }).populate("productId");
  if (!stockItem) {
    throw Object.assign(new Error("Stock item not found"), { statusCode: 404 });
  }
  return stockItem;
};

exports.getAllStockItems = async () => {
  const [items, products] = await Promise.all([
    StockItem.find().populate("productId").sort({ updatedAt: -1 }),
    Product.find({ status: "ACTIVE" }),
  ]);

  // Remove orphaned stock items (product was deleted)
  const orphans = items.filter((i) => !i.productId);
  if (orphans.length > 0) {
    await StockItem.deleteMany({ _id: { $in: orphans.map((o) => o._id) } });
  }
  const validItems = items.filter((i) => i.productId);

  // Find products that have no stock item yet and create virtual entries
  const coveredIds = new Set(validItems.map((i) => String(i.productId._id)));
  const missing = products.filter((p) => !coveredIds.has(String(p._id)));

  if (missing.length > 0) {
    const created = await StockItem.insertMany(
      missing.map((p) => ({
        productId: p._id,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        status: "ACTIVE",
      }))
    );
    const newItems = await StockItem.find({
      _id: { $in: created.map((c) => c._id) },
    }).populate("productId");
    return [...validItems, ...newItems];
  }

  return validItems;
};

exports.ensureEnoughAvailableStock = (stockItem, quantity) => {
  // Recalculate available stock to ensure accuracy
  const available = stockItem.quantityOnHand - stockItem.quantityReserved;
  if (available < quantity) {
    throw Object.assign(
      new Error(
        `Insufficient stock: available ${available}, requested ${quantity}`
      ),
      { statusCode: 409 }
    );
  }
};

exports.ensureEnoughReservedStock = (stockItem, quantity) => {
  if (stockItem.quantityReserved < quantity) {
    throw Object.assign(
      new Error(
        `Insufficient reserved stock: reserved ${stockItem.quantityReserved}, requested ${quantity}`
      ),
      { statusCode: 409 }
    );
  }
};

exports.touchLastMovement = async (stockItem) => {
  stockItem.lastMovementAt = new Date();
  await stockItem.save();
  return stockItem;
};

exports.getDepotAvailability = async ({ productIds = null } = {}) => {
  const productFilter =
    Array.isArray(productIds) && productIds.length > 0
      ? { productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) } }
      : {};

  const [depots, balances, stockItems] = await Promise.all([
    Depot.find({ status: "ACTIVE" }).select("_id name productTypeScope status"),
    StockMovement.aggregate([
      {
        $match: {
          status: "POSTED",
          depotId: { $ne: null },
          ...productFilter,
        },
      },
      {
        $group: {
          _id: {
            productId: "$productId",
            depotId: "$depotId",
          },
          quantityOnHand: {
            $sum: { $subtract: ["$newOnHand", "$previousOnHand"] },
          },
          quantityReserved: {
            $sum: { $subtract: ["$newReserved", "$previousReserved"] },
          },
        },
      },
    ]),
    productFilter.productId
      ? StockItem.find({ productId: productFilter.productId.$in }).select(
          "productId quantityOnHand quantityReserved quantityAvailable"
        )
      : StockItem.find().select("productId quantityOnHand quantityReserved quantityAvailable"),
  ]);

  const totalsByProduct = new Map(
    stockItems.map((item) => [
      String(item.productId),
      {
        quantityOnHand: Number(item.quantityOnHand || 0),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),
      },
    ])
  );

  const rows = balances.map((row) => {
    const quantityOnHand = Number(row.quantityOnHand || 0);
    const quantityReserved = Number(row.quantityReserved || 0);
    return {
      productId: String(row._id.productId),
      depotId: String(row._id.depotId),
      quantityOnHand,
      quantityReserved,
      quantityAvailable: quantityOnHand - quantityReserved,
    };
  });

  const assignedByProduct = new Map();
  for (const row of rows) {
    const current = assignedByProduct.get(row.productId) || {
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
    };
    current.quantityOnHand += row.quantityOnHand;
    current.quantityReserved += row.quantityReserved;
    current.quantityAvailable += row.quantityAvailable;
    assignedByProduct.set(row.productId, current);
  }

  for (const [productId, total] of totalsByProduct.entries()) {
    const assigned = assignedByProduct.get(productId) || {
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
    };
    const unassignedOnHand = total.quantityOnHand - assigned.quantityOnHand;
    const unassignedReserved = total.quantityReserved - assigned.quantityReserved;
    const unassignedAvailable = total.quantityAvailable - assigned.quantityAvailable;

    if (unassignedOnHand !== 0 || unassignedReserved !== 0 || unassignedAvailable !== 0) {
      rows.push({
        productId,
        depotId: null,
        quantityOnHand: unassignedOnHand,
        quantityReserved: unassignedReserved,
        quantityAvailable: unassignedAvailable,
      });
    }
  }

  return {
    depots,
    rows,
  };
};

exports.getDepotAvailabilityForProduct = async (productId, depotId = null) => {
  const snapshot = await exports.getDepotAvailability({ productIds: [String(productId)] });
  const row = snapshot.rows.find(
    (entry) =>
      String(entry.productId) === String(productId) &&
      String(entry.depotId || "") === String(depotId || "")
  );

  return {
    quantityOnHand: Number(row?.quantityOnHand || 0),
    quantityReserved: Number(row?.quantityReserved || 0),
    quantityAvailable: Number(row?.quantityAvailable || 0),
  };
};
