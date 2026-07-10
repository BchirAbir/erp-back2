const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-order.controller");
const {
  idParam,
  createPurchaseOrderBody,
  updatePurchaseOrderStatusBody,
} = require("../schemas/purchase-order.schema");

async function purchaseOrderRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];
  const deliveryAccess = [protect, requireRole("ADMIN", "DEPOT_MANAGER", "STOCK_MANAGER", "COMMERCIAL_MANAGER", "FINANCE_MANAGER", "HR_MANAGER")];

  fastify.get("/pending-delivery", { preHandler: deliveryAccess }, controller.getPendingDeliveries);
  fastify.get("/", { preHandler: access }, controller.getAllPurchaseOrders);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, controller.getPurchaseOrderById);
  fastify.post("/", { preHandler: access, schema: { body: createPurchaseOrderBody } }, controller.createPurchaseOrder);
  fastify.patch(
    "/:id/status",
    { preHandler: access, schema: { params: idParam, body: updatePurchaseOrderStatusBody } },
    controller.updatePurchaseOrderStatus
  );
  fastify.post("/:id/cancel", { preHandler: access, schema: { params: idParam } }, controller.cancelPurchaseOrder);
}

module.exports = purchaseOrderRoutes;
