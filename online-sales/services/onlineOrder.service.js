const OnlineOrder       = require("../../models/OnlineOrder");
const OnlineProduct     = require("../../models/OnlineProduct");
const Promotion         = require("../../models/Promotion");
const Campaign          = require("../../models/Campaign");
const Customer          = require("../../modules/commercial/models/customer.model");
const salesOrderService = require("../../modules/commercial/services/sales-order.service");
const stockMovement     = require("../../modules/stock/services/stock-movement.service");

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveCustomer({ name, email, phone, address }) {
  if (!name) return null;
  let customer = null;
  if (email) customer = await Customer.findOne({ email: email.toLowerCase().trim() });
  if (!customer) customer = await Customer.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
  if (!customer) customer = await Customer.create({ name, email, phone, address });
  return customer;
}

async function applyPromotion(lines, promotionCode) {
  if (!promotionCode || !promotionCode.trim()) {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    return { promotion: null, discountPct: 0, adjustedLines: lines, subtotal, totalAmount: subtotal };
  }
  const today = new Date().toISOString().slice(0, 10);
  const promotion = await Promotion.findOne({
    code: promotionCode.trim().toUpperCase(), status: "Active",
    startDate: { $lte: today },
    $or: [{ endDate: "" }, { endDate: { $gte: today } }],
  });
  if (!promotion) throw Object.assign(new Error(`Promotion code "${promotionCode}" is invalid or expired`), { statusCode: 400 });
  const discountPct   = promotion.discount;
  const multiplier    = 1 - discountPct / 100;
  const adjustedLines = lines.map(l => ({ ...l, discountedPrice: parseFloat((l.unitPrice * multiplier).toFixed(3)) }));
  const subtotal      = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalAmount   = parseFloat((subtotal * multiplier).toFixed(3));
  return { promotion, discountPct, adjustedLines, subtotal, totalAmount };
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

/**
 * Validate that every order line has a stockProductId before processing.
 * Throws a 400 error listing the product names that are missing stock links.
 */
async function validateStockLinks(order) {
  const missing = order.lines.filter(l => !l.stockProductId);
  if (missing.length > 0) {
    const names = missing.map(l => l.productName || l.sku || String(l.productId)).join(", ");
    throw Object.assign(
      new Error(
        `Cannot process order — the following products are not linked to stock and cannot be passed to Commercial: ${names}. ` +
        `Please update the product catalog to link them to a stock item first.`
      ),
      { statusCode: 400 }
    );
  }
}

/**
 * Reserve stock for all lines in an order.
 * Skips lines without a stockProductId (gracefully).
 * Returns true if all succeeded, false if any failed (non-blocking by design).
 */
async function reserveStockForOrder(order) {
  let allOk = true;
  for (const line of order.lines) {
    if (!line.stockProductId) continue;
    try {
      await stockMovement.reserveStock({
        productId:    line.stockProductId,
        quantity:     line.quantity,
        sourceModule: "COMMERCIAL",
        sourceType:   "ONLINE_ORDER_PROCESSING",
        sourceId:     String(order._id),
        reference:    order.orderNo,
        reason:       `Online order ${order.orderNo} — stock reserved`,
      });
    } catch (err) {
      console.error(`[OnlineSales] Reserve stock failed for product ${line.stockProductId}:`, err.message);
      allOk = false;
    }
  }
  return allOk;
}

/**
 * Deduct reserved stock when order is completed (shipped/delivered).
 */
async function deductStockForOrder(order) {
  for (const line of order.lines) {
    if (!line.stockProductId) continue;
    try {
      await stockMovement.deductReservedStock({
        productId:    line.stockProductId,
        quantity:     line.quantity,
        sourceModule: "COMMERCIAL",
        sourceType:   "ONLINE_ORDER_COMPLETED",
        sourceId:     String(order._id),
        reference:    order.orderNo,
        reason:       `Online order ${order.orderNo} — stock deducted on completion`,
      });
    } catch (err) {
      console.error(`[OnlineSales] Deduct stock failed for product ${line.stockProductId}:`, err.message);
    }
  }
}

/**
 * Release reservation when order is cancelled.
 */
async function releaseStockForOrder(order) {
  if (!order.stockReserved) return;
  for (const line of order.lines) {
    if (!line.stockProductId) continue;
    try {
      await stockMovement.releaseReservation({
        productId:    line.stockProductId,
        quantity:     line.quantity,
        sourceModule: "COMMERCIAL",
        sourceType:   "ONLINE_ORDER_CANCELLED",
        sourceId:     String(order._id),
        reference:    order.orderNo,
        reason:       `Online order ${order.orderNo} cancelled — reservation released`,
      });
    } catch (err) {
      console.error(`[OnlineSales] Release stock failed for product ${line.stockProductId}:`, err.message);
    }
  }
}

/**
 * Restock (ENTRY) when a return is refunded — called from onlineReturn.service.
 */
async function restockForReturn(order, returnDoc) {
  for (const line of order.lines) {
    if (!line.stockProductId) continue;
    try {
      await stockMovement.createEntry({
        productId:    line.stockProductId,
        quantity:     line.quantity,
        sourceModule: "COMMERCIAL",
        sourceType:   "CUSTOMER_RETURN",
        sourceId:     String(returnDoc._id),
        reference:    returnDoc.returnNo,
        reason:       `Online return ${returnDoc.returnNo} refunded — stock restocked`,
      });
    } catch (err) {
      console.error(`[OnlineSales] Restock failed for product ${line.stockProductId}:`, err.message);
    }
  }
}

// ─── Finance helpers ──────────────────────────────────────────────────────────

/**
 * Record a finance entry when an online order is completed.
 * Uses entryType "MANUAL_ENTRY" (valid enum) with direction "INFLOW".
 */
async function recordRevenueForOrder(order) {
  try {
    const FinanceEntry = require("../../modules/finance/models/finance-entry.model");
    await FinanceEntry.findOneAndUpdate(
      { sourceType: "ONLINE_ORDER_COMPLETED", sourceId: String(order._id) },
      {
        $setOnInsert: {
          entryType:        "MANUAL_ENTRY",
          direction:        "INFLOW",
          sourceModule:     "COMMERCIAL",
          sourceType:       "ONLINE_ORDER_COMPLETED",
          sourceId:         String(order._id),
          reference:        order.orderNo,
          counterpartyType: "CUSTOMER",
          counterpartyId:   String(order.customerId || ""),
          counterpartyName: order.customer?.name || "",
          amount:           order.totalAmount,
          currency:         "TND",
          status:           "INFO",
          occurredAt:       new Date(),
          notes:            `Online order ${order.orderNo} completed`,
          metadata: {
            promotionCode:     order.promotionCode  || "",
            promotionDiscount: order.promotionDiscount || 0,
            subtotal:          order.subtotal       || order.totalAmount,
          },
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[OnlineSales] Finance entry failed:", err.message);
  }
}

/**
 * Record an outflow finance entry when an online return is refunded.
 * Uses entryType "MANUAL_ENTRY" (valid enum) with direction "OUTFLOW".
 */
async function recordRefundForReturn(order, returnDoc) {
  try {
    const FinanceEntry = require("../../modules/finance/models/finance-entry.model");
    await FinanceEntry.findOneAndUpdate(
      { sourceType: "ONLINE_RETURN_REFUNDED", sourceId: String(returnDoc._id) },
      {
        $setOnInsert: {
          entryType:        "MANUAL_ENTRY",
          direction:        "OUTFLOW",
          sourceModule:     "COMMERCIAL",
          sourceType:       "ONLINE_RETURN_REFUNDED",
          sourceId:         String(returnDoc._id),
          reference:        returnDoc.returnNo,
          counterpartyType: "CUSTOMER",
          counterpartyId:   String(order.customerId || ""),
          counterpartyName: returnDoc.customer?.name || "",
          amount:           returnDoc.amount,
          currency:         "TND",
          status:           "INFO",
          occurredAt:       new Date(),
          notes:            `Online return ${returnDoc.returnNo} refunded — order ${order.orderNo}`,
          metadata: { reason: returnDoc.reason },
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[OnlineSales] Refund finance entry failed:", err.message);
  }
}

// ─── Tracking sync helper ─────────────────────────────────────────────────────

/**
 * Pull tracking info from the Commercial SalesOrder back onto the OnlineOrder.
 * Called on-demand (e.g. when the frontend loads the order detail, or via a cron).
 */
async function syncTrackingFromCommercial(order) {
  if (!order.commercialSalesOrderId) return order;
  try {
    const SalesOrder = require("../../modules/commercial/models/sales-order.model");
    const commercialOrder = await SalesOrder.findById(order.commercialSalesOrderId)
      .populate("carrierId", "name")
      .select("trackingNumber carrierId shippedAt deliveredAt status")
      .lean();

    if (!commercialOrder) return order;

    const update = {};
    if (commercialOrder.trackingNumber && !order.trackingNumber)
      update.trackingNumber = commercialOrder.trackingNumber;
    if (commercialOrder.carrierId?.name && !order.carrierName)
      update.carrierName = commercialOrder.carrierId.name;
    if (commercialOrder.shippedAt && !order.shippedAt)
      update.shippedAt = commercialOrder.shippedAt;
    if (commercialOrder.deliveredAt && !order.deliveredAt)
      update.deliveredAt = commercialOrder.deliveredAt;

    // Sync status: if Commercial delivered → mark online order completed
    if (["DELIVERED", "CLOSED"].includes(commercialOrder.status) && order.status === "processing") {
      update.status = "completed";
    }

    if (Object.keys(update).length > 0) {
      return OnlineOrder.findByIdAndUpdate(order._id, update, { new: true }).lean();
    }
  } catch (err) {
    console.error("[OnlineSales] Tracking sync failed:", err.message);
  }
  return order;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const onlineOrderService = {

  // ── LIST ────────────────────────────────────────────────────────────────────
  async getAll({ search = "", status = "all", page = 1, limit = 50 } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { orderNo:          { $regex: search, $options: "i" } },
        { "customer.name":  { $regex: search, $options: "i" } },
        { promotionCode:    { $regex: search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      OnlineOrder.find(query)
        .populate("promotionId", "name code discount")
        .populate("campaignId",  "name channel")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      OnlineOrder.countDocuments(query),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  },

  // ── GET ONE (with tracking sync) ─────────────────────────────────────────
  async getById(id) {
    let order = await OnlineOrder.findById(id)
      .populate("promotionId", "name code discount type")
      .populate("campaignId",  "name channel status")
      .populate("customerId",  "name email phone")
      .lean();
    if (!order) return null;
    // Sync tracking from Commercial on each detail fetch
    order = await syncTrackingFromCommercial(order);
    return order;
  },

  // ── CREATE ───────────────────────────────────────────────────────────────
 async create({ customer, lines: rawLines, promotionCode, campaignId, notes = "" }, createdBy = null) {

    // 1. Enrich lines with stockProductId
    const enrichedLines = await Promise.all(rawLines.map(async (l) => {
      const op = await OnlineProduct.findById(l.productId).lean();
      if (!op) throw Object.assign(new Error(`Online product ${l.productId} not found`), { statusCode: 404 });
      return { ...l, stockProductId: op.stockProductId, productName: op.name, sku: op.sku, unitPrice: l.unitPrice ?? op.onlinePrice };
    }));

    // 2. Apply promotion
    const { promotion, discountPct, adjustedLines, subtotal, totalAmount } = await applyPromotion(enrichedLines, promotionCode);

    // 3. Commercial customer
    const commercialCustomer = await resolveCustomer(customer);

    // 4. Campaign leads
    if (campaignId) await Campaign.findByIdAndUpdate(campaignId, { $inc: { leads: 1 } });

    const order = new OnlineOrder({
      customer, customerId: commercialCustomer?._id ?? null,
      lines: adjustedLines, subtotal, totalAmount,
      promotionId: promotion?._id ?? null, promotionCode: promotion?.code ?? "",
      promotionDiscount: discountPct, campaignId: campaignId ?? null, notes,createdBy,
    });
    return order.save();
  },

  // ── UPDATE STATUS ─────────────────────────────────────────────────────────
  async updateStatus(id, status, userId = null) {
    const order = await OnlineOrder.findById(id);
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    const prev = order.status;
    if (prev === status) return order;

    // ── pending → processing ─────────────────────────────────────────────────
    if (status === "processing") {

      // ⛔ GUARD: block if any product has no stock link
      await validateStockLinks(order);

      // 1. STOCK: reserve
      const reserved = await reserveStockForOrder(order);
      order.stockReserved = reserved;

      // 2. COMMERCIAL: create SalesOrder
      if (!order.commercialSalesOrderId) {
        const commercialLines = order.lines
          .filter(l => l.stockProductId)
          .map(l => ({ productId: l.stockProductId, quantity: l.quantity, unitPrice: l.discountedPrice ?? l.unitPrice }));

        if (commercialLines.length > 0) {
          try {
            const commercialOrder = await salesOrderService.createOrder({
              customerName: order.customer.name,
              customerId:   order.customerId ?? null,
              lines:        commercialLines,
              notes:        `Online order ${order.orderNo}${order.promotionCode ? ` | Promo: ${order.promotionCode}` : ""}`,
              source:       "MANUAL",
              createdBy:    userId,
            });
            order.commercialSalesOrderId = commercialOrder._id;
            order.commercialSalesOrderNo = commercialOrder.orderNo;
          } catch (err) {
            console.error("[OnlineSales] Commercial SalesOrder creation failed:", err.message);
          }
        }
      }

      // 3. MARKETING: update campaign conversion rate
      if (order.campaignId) {
        const campaign = await Campaign.findById(order.campaignId);
        if (campaign && campaign.leads > 0) {
          const conversions = Math.round((campaign.conversionRate / 100) * campaign.leads) + 1;
          const newRate = parseFloat(((conversions / campaign.leads) * 100).toFixed(1));
          await Campaign.findByIdAndUpdate(order.campaignId, { conversionRate: Math.min(newRate, 100) });
        }
      }
    }

    // ── processing → completed ────────────────────────────────────────────────
    if (status === "completed") {
      // 1. STOCK: deduct reserved stock
      await deductStockForOrder(order);
      order.stockReserved = false;

      // 2. FINANCE: revenue entry
      order.status = "completed"; // set before passing to finance helper
      await recordRevenueForOrder(order);

      // 3. TRACKING: sync from Commercial
      await syncTrackingFromCommercial(order);
    }

    // ── any → cancelled ───────────────────────────────────────────────────────
    if (status === "cancelled") {
      // 1. STOCK: release reservation
      await releaseStockForOrder(order);
      order.stockReserved = false;

      // 2. MARKETING: decrement leads if still pending
      if (order.campaignId && prev === "pending") {
        await Campaign.findByIdAndUpdate(order.campaignId, { $inc: { leads: -1 } });
      }

      // 3. COMMERCIAL: cancel SalesOrder if still in DRAFT
      if (order.commercialSalesOrderId) {
        try { await salesOrderService.cancelOrder(order.commercialSalesOrderId, userId); } catch (_) {}
      }
    }

    order.status = status;
    return order.save();
  },

  // ── MANUAL TRACKING SYNC ──────────────────────────────────────────────────
  async syncTracking(id) {
    const order = await OnlineOrder.findById(id).lean();
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    return syncTrackingFromCommercial(order);
  },

  // ── UPDATE (general) ─────────────────────────────────────────────────────
  async update(id, data) {
    return OnlineOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  // ── DELETE ───────────────────────────────────────────────────────────────
  async remove(id) {
    return OnlineOrder.findByIdAndDelete(id);
  },

  // ── VALIDATE PROMO CODE ──────────────────────────────────────────────────
  async validatePromoCode(code) {
    const today = new Date().toISOString().slice(0, 10);
    const promo = await Promotion.findOne({
      code: code.trim().toUpperCase(), status: "Active",
      startDate: { $lte: today },
      $or: [{ endDate: "" }, { endDate: { $gte: today } }],
    }).select("name code discount type description");
    if (!promo) throw Object.assign(new Error("Invalid or expired promotion code"), { statusCode: 404 });
    return promo;
  },

  // ── STATS ─────────────────────────────────────────────────────────────────
  async getStats() {
    const [all, statusCounts, revenueAgg] = await Promise.all([
      OnlineOrder.countDocuments(),
      OnlineOrder.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      OnlineOrder.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
    ]);
    const byStatus = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
    for (const s of statusCounts) byStatus[s._id] = s.count;
    const totalRevenue  = revenueAgg[0]?.total ?? 0;
    const activeCount   = revenueAgg[0]?.count ?? 0;
    const avgOrderValue = activeCount > 0 ? totalRevenue / activeCount : 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAgg = await OnlineOrder.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: "cancelled" } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const chartData = monthlyAgg.map(m => ({ label: MONTHS[m._id.month - 1], revenue: m.revenue, orders: m.orders }));

    const promoAgg = await OnlineOrder.aggregate([
      { $match: { promotionId: { $ne: null } } },
      { $group: { _id: "$promotionCode", count: { $sum: 1 }, saved: { $sum: { $subtract: ["$subtotal", "$totalAmount"] } } } },
      { $sort: { count: -1 } }, { $limit: 5 },
    ]);

    return { totalOrders: all, byStatus, totalRevenue, avgOrderValue, chartData, topPromoCodes: promoAgg };
  },

  // ── Expose helpers for use by onlineReturn.service ───────────────────────
  _restockForReturn:     restockForReturn,
  _recordRefundForReturn: recordRefundForReturn,
};

module.exports = onlineOrderService;