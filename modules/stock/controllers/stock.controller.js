const stockService = require("../services/stock.service");
const stockMovementService = require("../services/stock-movement.service");
const Depot = require("../models/depot.model");
const StockProduct = require("../models/product.model");
const { success, error } = require("../../../utils/response");

function getAllowedProductTypes(scope) {
  if (scope === "MP") return ["MATIERE_PREMIERE"];
  if (scope === "PF") return ["PRODUIT_FINI"];
  // MP_PF → all types
  return ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"];
}

async function getDepotForManager(userId) {
  return Depot.findOne({ managerId: userId }).select("_id productTypeScope");
}

async function resolveDepotIdFromUser(user, bodyDepotId = null) {
  if (bodyDepotId) return bodyDepotId;
  if (!user?._id || user.role !== "DEPOT_MANAGER") return null;

  const depot = await getDepotForManager(user._id);
  return depot?._id || null;
}

exports.getAllStockItems = async (req, reply) => {
  try {
    const data = await stockService.getAllStockItems();
    return success(reply, data);
  } catch (err) {
    console.error("Error in getAllStockItems:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getStockItemByProductId = async (req, reply) => {
  try {
    const data = await stockService.getStockItemByProductId(req.params.productId);
    return success(reply, data);
  } catch (err) {
    console.error("Error in getStockItemByProductId:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getDepotAvailability = async (req, reply) => {
  try {
    const productIds = typeof req.query?.productIds === "string" && req.query.productIds.trim()
      ? req.query.productIds.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const data = await stockService.getDepotAvailability({ productIds });
    return success(reply, data);
  } catch (err) {
    console.error("Error in getDepotAvailability:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getMovementHistory = async (req, reply) => {
  try {
    const data = await stockMovementService.getMovementHistory(req.params.productId);
    return success(reply, data);
  } catch (err) {
    console.error("Error in getMovementHistory:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getAllMovements = async (req, reply) => {
  try {
    let extraFilter = {};
    if (req.user?.role === "DEPOT_MANAGER") {
      const depot = await getDepotForManager(req.user.id);
      if (depot) {
        extraFilter = { depotId: depot._id };
      }
    }
    const data = await stockMovementService.getMovementHistory(null, extraFilter);
    return success(reply, data);
  } catch (err) {
    console.error("Error in getAllMovements:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

async function assertProductAllowedForDepotManager(user, productId) {
  if (user?.role !== "DEPOT_MANAGER") return;
  const depot = await getDepotForManager(user._id);
  if (!depot) throw Object.assign(new Error("No depot assigned to this manager"), { statusCode: 403 });
  const product = await StockProduct.findById(productId).select("type");
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  const allowed = getAllowedProductTypes(depot.productTypeScope);
  if (!allowed.includes(product.type)) {
    throw Object.assign(
      new Error(`Your depot only handles ${depot.productTypeScope} products. This product type (${product.type}) is not allowed.`),
      { statusCode: 403 }
    );
  }
}

exports.createEntry = async (req, reply) => {
  try {
    await assertProductAllowedForDepotManager(req.user, req.body?.productId);
    const movement = await stockMovementService.createEntry({
      ...req.body,
      depotId: await resolveDepotIdFromUser(req.user, req.body?.depotId),
      createdBy: req.user?.id || null,
    });
    return success(reply, movement, 201);
  } catch (err) {
    console.error("Error in createEntry controller:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.createExit = async (req, reply) => {
  try {
    await assertProductAllowedForDepotManager(req.user, req.body?.productId);
    const movement = await stockMovementService.createExit({
      ...req.body,
      depotId: await resolveDepotIdFromUser(req.user, req.body?.depotId),
      createdBy: req.user?.id || null,
    });
    return success(reply, movement, 201);
  } catch (err) {
    console.error("Error in createExit controller:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.reserveStock = async (req, reply) => {
  try {
    const movement = await stockMovementService.reserveStock({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return success(reply, movement, 201);
  } catch (err) {
    console.error("Error in reserveStock controller:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.releaseReservation = async (req, reply) => {
  try {
    const movement = await stockMovementService.releaseReservation({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return success(reply, movement, 201);
  } catch (err) {
    console.error("Error in releaseReservation controller:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.deductReservedStock = async (req, reply) => {
  try {
    const movement = await stockMovementService.deductReservedStock({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return success(reply, movement, 201);
  } catch (err) {
    console.error("Error in deductReservedStock controller:", err);
    return error(reply, err.message, err.statusCode || 500);
  }
};
