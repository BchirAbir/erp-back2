// online-sales/services/onlineProduct.service.js
const OnlineProduct = require("../../models/OnlineProduct");
const OnlineOrder   = require("../../models/OnlineOrder");
const StockItem     = require("../../modules/stock/models/stock-item.model");
const mongoose      = require("mongoose");

// ── Warehouse stock ───────────────────────────────────────────────────────────
async function getWarehouseStock(stockProductId) {
  const item = await StockItem.findOne({ productId: stockProductId }).lean();
  if (!item) return { warehouseQty: null, warehouseStatus: "pending" };
  const qty = item.quantityAvailable ?? item.quantityOnHand ?? 0;
  if (item.quantityOnHand === 0 && !item.lastMovementAt)
    return { warehouseQty: null, warehouseStatus: "pending" };
  return { warehouseQty: qty, warehouseStatus: qty === 0 ? "out-of-stock" : "in-stock" };
}

// ── Units sold online (completed orders) ──────────────────────────────────────
async function getOnlineSoldQty(onlineProductId) {
  const oid = typeof onlineProductId === "string"
    ? new mongoose.Types.ObjectId(onlineProductId)
    : onlineProductId;
  const result = await OnlineOrder.aggregate([
    { $match: { status: "completed" } },
    { $unwind: "$lines" },
    { $match: { "lines.productId": oid } },
    { $group: { _id: null, totalSold: { $sum: "$lines.quantity" } } },
  ]);
  return result[0]?.totalSold ?? 0;
}

// ── Online status ─────────────────────────────────────────────────────────────
function getOnlineStatus(available, minThreshold) {
  if (available === null) return "pending";
  if (available <= 0)     return "out-of-stock";
  if (available <= (minThreshold ?? 0)) return "low-stock";
  return "in-stock";
}

// ── Enrich product with both stock layers ─────────────────────────────────────
async function enrichProduct(p) {
  const { warehouseQty, warehouseStatus } = await getWarehouseStock(p.stockProductId);
  const soldQty      = await getOnlineSoldQty(p._id);
  const allocatedQty = p.onlineAllocatedQty ?? 0;

  // If no allocation set, show warehouse qty as "available" (unmanaged mode)
  const effectiveAllocated = allocatedQty > 0 ? allocatedQty : (warehouseQty ?? 0);
  const availableOnline    = Math.max(0, effectiveAllocated - soldQty);
  const onlineStatus       = getOnlineStatus(
    allocatedQty > 0 ? availableOnline : warehouseQty,
    p.minStockThreshold
  );

  return {
    ...p,
    // Warehouse layer
    warehouseQty,
    warehouseStatus,
    // Online layer
    onlineAllocatedQty:  allocatedQty,
    onlineSoldQty:       soldQty,
    onlineAvailableQty:  availableOnline,
    onlineStatus,
    // Legacy compatibility
    stock:       warehouseQty,
    stockStatus: onlineStatus,
  };
}

const onlineProductService = {

  async getAll({ search = "", status = "all" } = {}) {
    const query = {};
    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: "i" } },
        { sku:      { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    const products = await OnlineProduct.find(query).lean();
    const enriched = await Promise.all(products.map(enrichProduct));
    if (status !== "all") return enriched.filter(p => p.onlineStatus === status);
    return enriched;
  },

  async getById(id) {
    const p = await OnlineProduct.findById(id).lean();
    if (!p) return null;
    return enrichProduct(p);
  },

  async create(data, createdBy = null) {
    const product = new OnlineProduct({ ...data, createdBy });
    return product.save();
  },

  async update(id, data) {
    return OnlineProduct.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async updateAllocation(id, onlineAllocatedQty) {
    if (onlineAllocatedQty < 0)
      throw Object.assign(new Error("Allocation cannot be negative"), { statusCode: 400 });
    const p = await OnlineProduct.findByIdAndUpdate(
      id,
      { onlineAllocatedQty },
      { new: true, runValidators: true }
    ).lean();
    if (!p) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
    return enrichProduct(p);
  },

  async remove(id) {
    return OnlineProduct.findByIdAndDelete(id);
  },

  async toggleVisibility(id) {
    const p = await OnlineProduct.findById(id);
    if (!p) return null;
    p.isVisible = !p.isVisible;
    return p.save();
  },

  async getStats() {
    const products = await OnlineProduct.find({}).lean();
    let inStock = 0, lowStock = 0, outOfStock = 0, totalValue = 0;
    let warehouseTotal = 0, onlineAllocatedTotal = 0, onlineSoldTotal = 0, onlineAvailableTotal = 0;

    for (const p of products) {
      const e = await enrichProduct(p);
      if (e.onlineStatus === "in-stock")      inStock++;
      else if (e.onlineStatus === "low-stock") lowStock++;
      else                                    outOfStock++;
      totalValue           += p.onlinePrice * (e.onlineAvailableQty ?? 0);
      warehouseTotal       += e.warehouseQty ?? 0;
      onlineAllocatedTotal += e.onlineAllocatedQty ?? 0;
      onlineSoldTotal      += e.onlineSoldQty ?? 0;
      onlineAvailableTotal += e.onlineAvailableQty ?? 0;
    }

    const avgPrice = products.length > 0
      ? products.reduce((s, p) => s + p.onlinePrice, 0) / products.length
      : 0;

    return {
      total: products.length,
      inStock, lowStock, outOfStock,
      totalValue, avgPrice,
      warehouseTotal,
      onlineAllocatedTotal,
      onlineSoldTotal,
      onlineAvailableTotal,
    };
  },
};

module.exports = onlineProductService;