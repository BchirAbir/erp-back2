const onlineOrderService    = require("./onlineOrder.service");
const onlineShipmentService = require("./onlineShipment.service");
const onlineReturnService   = require("./onlineReturn.service");
const onlineProductService  = require("./onlineProduct.service");
const Promotion             = require("../../models/Promotion");
const Campaign              = require("../../models/Campaign");
const OnlineOrder           = require("../../models/OnlineOrder");

const onlineSalesStatsService = {
  async getDashboardStats() {
    const today = new Date().toISOString().slice(0, 10);

    const [orderStats, shipmentStats, returnStats, productStats] = await Promise.all([
      onlineOrderService.getStats(),
      onlineShipmentService.getStats(),
      onlineReturnService.getStats(),
      onlineProductService.getStats(),
    ]);

    // ── New customers this calendar month ───────────────────────────────────
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomers = await OnlineOrder.distinct("customer.email", {
      createdAt: { $gte: startOfMonth },
    });

    // ── Marketing: active promotions available in the store ─────────────────
    const activePromotions = await Promotion.find({
      status:    "Active",
      startDate: { $lte: today },
      $or: [{ endDate: "" }, { endDate: { $gte: today } }],
    })
      .select("name code discount type description endDate")
      .sort({ discount: -1 })
      .lean();

    // ── Marketing: active campaigns (for campaign attribution display) ──────
    const activeCampaigns = await Campaign.find({ status: "Active" })
      .select("name channel leads conversionRate budget spend")
      .sort({ leads: -1 })
      .lean();

    return {
      // KPIs
      totalRevenue:      orderStats.totalRevenue,
      totalOrders:       orderStats.totalOrders,
      pendingShipments:  shipmentStats.byStatus.pending + shipmentStats.byStatus["in-transit"],
      totalReturns:      returnStats.total,
      avgOrderValue:     orderStats.avgOrderValue,
      newCustomers:      newCustomers.length,

      // Breakdowns
      ordersByStatus:    orderStats.byStatus,
      shipmentsByStatus: shipmentStats.byStatus,
      returnsByStatus:   returnStats.byStatus,

      // Charts
      chartData: orderStats.chartData,

      // Catalog
      catalogStats: productStats,

      // Marketing
      activePromotions,
      activeCampaigns,
      topPromoCodes: orderStats.topPromoCodes,
    };
  },
};

module.exports = onlineSalesStatsService;