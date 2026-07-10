const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-scan.controller");

async function purchaseScanRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.post("/", { preHandler: access }, controller.scanInvoice);
}

module.exports = purchaseScanRoutes;
