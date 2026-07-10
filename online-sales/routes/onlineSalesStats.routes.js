const statsService = require("../services/onlineSalesStats.service");
const { protect, requireRole } = require("../../hooks/auth.hook");

async function onlineSalesStatsRoutes(fastify) {
  // GET /api/online-sales/stats
  fastify.get("/stats", {
    preHandler: [protect, requireRole("SALES_MANAGER", "ADMIN")],
  }, async (req, reply) => {
    const stats = await statsService.getDashboardStats();
    return reply.send(stats);
  });
}

module.exports = onlineSalesStatsRoutes;