// online-sales/services/stockRefill.service.js
const StockRefillRequest = require("../../models/StockRefillRequest");
const OnlineProduct      = require("../../models/OnlineProduct");
const StockItem          = require("../../modules/stock/models/stock-item.model");

// ── Notify helper ──────────────────────────────────────────────────────────
async function notify(recipientRole, type, message, targetId, targetName, actorName) {
  try {
    const SystemNotification = require("../../models/SystemNotification");
    await SystemNotification.create({ recipientRole, type, message, targetId, targetName, actorName });
  } catch (err) {
    console.error("[Refill] Notification failed:", err.message);
  }
}

// ── Helper: get live warehouse stock ─────────────────────────────────────────
async function getLiveStock(stockProductId) {
  const item = await StockItem.findOne({ productId: stockProductId }).lean();
  if (!item) return 0;
  return item.quantityAvailable ?? item.quantityOnHand ?? 0;
}

// ── Helper: check if warehouse has enough for all lines ──────────────────────
async function checkStockAvailability(lines) {
  const results = [];
  for (const line of lines) {
    const available = await getLiveStock(line.stockProductId);
    results.push({
      productName:  line.productName,
      sku:          line.sku,
      requested:    line.requestedQty,
      available,
      sufficient:   available >= line.requestedQty,
    });
  }
  return results;
}

const stockRefillService = {

  // ── CREATE ─────────────────────────────────────────────────────────────────
  async create({ productIds, quantities, priority = "NORMAL", notes = "", requestedBy = "" }) {
    const lines = [];
    for (const pid of productIds) {
      const product = await OnlineProduct.findById(pid).lean();
      if (!product) throw Object.assign(new Error(`Online product ${pid} not found`), { statusCode: 404 });

      const currentStock = await getLiveStock(product.stockProductId);
      const requestedQty = quantities[pid] ?? Math.max(1, (product.minStockThreshold ?? 5) * 2);

      lines.push({
        onlineProductId: product._id,
        stockProductId:  product.stockProductId,
        productName:     product.name,
        sku:             product.sku,
        currentStock,
        minThreshold:    product.minStockThreshold ?? 0,
        requestedQty,
      });
    }

    const req = new StockRefillRequest({ lines, priority, notes, requestedBy });
    const saved = await req.save();

    // Notify Stock Manager that a refill request needs attention
    const itemSummary = lines.map(l => `${l.productName} x${l.requestedQty}`).join(", ");
    await notify(
      "STOCK_MANAGER",
      "REFILL_REQUESTED",
      `Stock refill requested (${saved.requestNo}) — ${itemSummary}. Priority: ${priority || "NORMAL"}.`,
      String(saved._id),
      saved.requestNo,
      requestedBy || "Online Sales"
    );

    return saved;
  },

  // ── LIST ───────────────────────────────────────────────────────────────────
  async getAll({ status = "all", page = 1, limit = 50 } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      StockRefillRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StockRefillRequest.countDocuments(query),
    ]);
    return { requests, total, page, pages: Math.ceil(total / limit) };
  },

  // ── GET ONE ────────────────────────────────────────────────────────────────
  async getById(id) {
    return StockRefillRequest.findById(id).lean();
  },

  // ── UPDATE STATUS ──────────────────────────────────────────────────────────
  // Key logic:
  // - "approved"  → check warehouse stock first; if insufficient, block and return
  //                 details so the caller knows to keep it pending
  // - "fulfilled" → update onlineAllocatedQty on the product automatically
  // - "rejected"  → no stock check needed
  // - "pending"   → reset (re-open)
  async updateStatus(id, status, adminNotes = "") {
    const req = await StockRefillRequest.findById(id);
    if (!req) throw Object.assign(new Error("Refill request not found"), { statusCode: 404 });

    // ── Stock availability check before approving ──────────────────────────
    if (status === "approved") {
      const availability = await checkStockAvailability(req.lines);
      const insufficient = availability.filter(a => !a.sufficient);

      if (insufficient.length > 0) {
        // Build a readable message
        const details = insufficient
          .map(a => `${a.productName} (requested: ${a.requested}, available: ${a.available})`)
          .join("; ");

        // Don't change status — request stays pending until production restocks
        const note = `Awaiting production — insufficient warehouse stock: ${details}`;
        req.adminNotes = adminNotes ? `${adminNotes} | ${note}` : note;
        await req.save();

        throw Object.assign(
          new Error(
            `Cannot approve — insufficient warehouse stock for: ${details}. ` +
            `Request remains pending until production restocks these items.`
          ),
          { statusCode: 409, insufficient, availability }
        );
      }
    }

    // ── On fulfillment: increase online allocation automatically ───────────
    if (status === "fulfilled") {
      for (const line of req.lines) {
        const product = await OnlineProduct.findById(line.onlineProductId);
        if (product) {
          product.onlineAllocatedQty = (product.onlineAllocatedQty || 0) + line.requestedQty;
          await product.save();
        }
      }
    }

    req.status = status;
    if (adminNotes) req.adminNotes = adminNotes;
    if (["approved", "rejected", "fulfilled"].includes(status)) req.resolvedAt = new Date();

    const saved = await req.save();

    // Notify Sales Manager of the decision
    if (status === "approved") {
      await notify(
        "SALES_MANAGER",
        "REFILL_APPROVED",
        `Stock refill ${req.requestNo} has been approved. Items will be allocated once fulfilled.`,
        String(req._id),
        req.requestNo,
        "Stock Department"
      );
    } else if (status === "rejected") {
      await notify(
        "SALES_MANAGER",
        "REFILL_REJECTED",
        `Stock refill ${req.requestNo} has been rejected.${adminNotes ? " Reason: " + adminNotes : ""}`,
        String(req._id),
        req.requestNo,
        "Stock Department"
      );
    }

    return saved;
  },

  // ── CHECK AVAILABILITY (exposed for frontend preview) ─────────────────────
  async checkAvailability(id) {
    const req = await StockRefillRequest.findById(id).lean();
    if (!req) throw Object.assign(new Error("Refill request not found"), { statusCode: 404 });
    return checkStockAvailability(req.lines);
  },

  // ── AUTO-RETRY pending requests after new stock movement ──────────────────
  // Called by the stock movement service after each new incoming movement.
  // Checks all pending refill requests to see if warehouse now has enough.
  async retryPendingAfterRestock() {
    const pending = await StockRefillRequest.find({ status: "pending" }).lean();
    const nowSatisfied = [];

    for (const req of pending) {
      const availability = await checkStockAvailability(req.lines);
      const allSufficient = availability.every(a => a.sufficient);
      if (allSufficient) nowSatisfied.push(req);
    }

    return {
      checked:   pending.length,
      satisfied: nowSatisfied.map(r => ({ id: r._id, requestNo: r.requestNo, lines: r.lines })),
    };
  },

  // ── DELETE ─────────────────────────────────────────────────────────────────
  async remove(id) {
    return StockRefillRequest.findByIdAndDelete(id);
  },

  // ── STATS ──────────────────────────────────────────────────────────────────
  async getStats() {
    const [total, pending, approved, fulfilled, rejected] = await Promise.all([
      StockRefillRequest.countDocuments(),
      StockRefillRequest.countDocuments({ status: "pending" }),
      StockRefillRequest.countDocuments({ status: "approved" }),
      StockRefillRequest.countDocuments({ status: "fulfilled" }),
      StockRefillRequest.countDocuments({ status: "rejected" }),
    ]);
    return { total, pending, approved, fulfilled, rejected };
  },
};

module.exports = stockRefillService;