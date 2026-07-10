const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-payment.controller");
const { createPurchasePaymentBody } = require("../schemas/purchase-payment.schema");

async function purchasePaymentRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAllPurchasePayments);
  fastify.get("/summary", { preHandler: access }, controller.getPaymentSummary);
  fastify.post("/", { preHandler: access, schema: { body: createPurchasePaymentBody } }, controller.createPurchasePayment);
}

module.exports = purchasePaymentRoutes;
