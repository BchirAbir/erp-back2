const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-receipt.controller");
const { idParam, createReceiptBody } = require("../schemas/purchase-receipt.schema");

async function purchaseReceiptRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];
  const receiveAccess = [protect, requireRole("ADMIN", "PURCHASE_MANAGER", "STOCK_MANAGER", "DEPOT_MANAGER", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAllReceipts);
  fastify.get("/mine", { preHandler: receiveAccess }, controller.getMyReceipts);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, controller.getReceiptById);
  fastify.post("/", { preHandler: receiveAccess }, controller.createReceipt);
}

module.exports = purchaseReceiptRoutes;
