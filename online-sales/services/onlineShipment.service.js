// online-sales/services/onlineShipment.service.js
const OnlineShipment = require("../../models/OnlineShipment");
const OnlineOrder    = require("../../models/OnlineOrder");

// Commercial statuses that mean the order has physically left the warehouse
const DISPATCHED_STATUSES = ["SHIPPED", "DELIVERED", "RETURNED", "CLOSED"];

// ── Guard: verify Commercial has dispatched before allowing in-transit ─────────
async function assertCommercialDispatched(shipment) {
  // Find the linked online order
  const onlineOrder = await OnlineOrder.findOne({
    $or: [
      { orderNo: shipment.orderNo },
      { _id:     shipment.orderId  },
    ],
  })
    .select("commercialSalesOrderId commercialSalesOrderNo orderNo")
    .lean();

  if (!onlineOrder) {
    throw Object.assign(
      new Error(`Online order ${shipment.orderNo} not found`),
      { statusCode: 404 }
    );
  }

  // If no commercial order linked yet → cannot mark as shipped
  if (!onlineOrder.commercialSalesOrderId) {
    throw Object.assign(
      new Error(
        `Cannot mark as shipped — order ${shipment.orderNo} has not been processed by Commercial yet. ` +
        `The order must be passed to Commercial (status: processing) before a shipment can be dispatched.`
      ),
      { statusCode: 400 }
    );
  }

  // Check the Commercial SalesOrder status
  const SalesOrder = require("../../modules/commercial/models/sales-order.model");
  const commercialOrder = await SalesOrder.findById(onlineOrder.commercialSalesOrderId)
    .select("status orderNo")
    .lean();

  if (!commercialOrder) {
    throw Object.assign(
      new Error(
        `Commercial order ${onlineOrder.commercialSalesOrderNo || onlineOrder.commercialSalesOrderId} not found`
      ),
      { statusCode: 404 }
    );
  }

  if (!DISPATCHED_STATUSES.includes(commercialOrder.status)) {
    throw Object.assign(
      new Error(
        `Cannot mark as shipped — Commercial order ${commercialOrder.orderNo} is currently "${commercialOrder.status}". ` +
        `It must be marked as SHIPPED by the Commercial Manager before this shipment can be dispatched. ` +
        `Current allowed statuses: ${DISPATCHED_STATUSES.join(", ")}.`
      ),
      { statusCode: 400 }
    );
  }
}

const onlineShipmentService = {

  // ── LIST ────────────────────────────────────────────────────────────────────
  async getAll({ search = "", status = "all", page = 1, limit = 50 } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { shipmentNo:      { $regex: search, $options: "i" } },
        { orderNo:         { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { trackingNumber:  { $regex: search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const [shipments, total] = await Promise.all([
      OnlineShipment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      OnlineShipment.countDocuments(query),
    ]);
    return { shipments, total, page, pages: Math.ceil(total / limit) };
  },

  // ── GET ONE ─────────────────────────────────────────────────────────────────
  async getById(id) {
    return OnlineShipment.findById(id).lean();
  },

  // ── CREATE ──────────────────────────────────────────────────────────────────
  async create(data, createdBy = null) {
   const shipment = new OnlineShipment({ ...data, createdBy });
    return shipment.save();
  },

  // ── UPDATE STATUS ────────────────────────────────────────────────────────────
  async updateStatus(id, status) {
    const shipment = await OnlineShipment.findById(id).lean();
    if (!shipment) throw Object.assign(new Error("Shipment not found"), { statusCode: 404 });

    // ⛔ GUARD: only allow in-transit if Commercial has dispatched
    if (status === "in-transit") {
      await assertCommercialDispatched(shipment);
    }

    const update = { status };
    if (status === "in-transit") update.shippedAt   = new Date();
    if (status === "delivered")  update.deliveredAt = new Date();

    return OnlineShipment.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  },

  // ── UPDATE ──────────────────────────────────────────────────────────────────
  async update(id, data) {
    return OnlineShipment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  // ── DELETE ──────────────────────────────────────────────────────────────────
  async remove(id) {
    return OnlineShipment.findByIdAndDelete(id);
  },

  // ── STATS ───────────────────────────────────────────────────────────────────
  async getStats() {
    const statusCounts = await OnlineShipment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byStatus = { pending: 0, "in-transit": 0, delivered: 0, failed: 0 };
    for (const s of statusCounts) byStatus[s._id] = s.count;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { total, byStatus };
  },
};

module.exports = onlineShipmentService;