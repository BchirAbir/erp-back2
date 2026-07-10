const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-return.controller");
const { idParam, createReturnBody, updateReturnStatusBody } = require("../schemas/purchase-return.schema");

async function purchaseReturnRoutes(fastify) {
  const adminAccess = [protect, requireRole("ADMIN", "PURCHASE_MANAGER", "FINANCE_MANAGER")];
  const receiverAccess = [
    protect,
    requireRole("ADMIN", "DEPOT_MANAGER", "STOCK_MANAGER", "COMMERCIAL_MANAGER"),
  ];

  fastify.get("/", { preHandler: adminAccess }, controller.getAllReturns);
  fastify.get("/mine", { preHandler: receiverAccess }, controller.getMyReturns);
  fastify.get("/:id", { preHandler: adminAccess, schema: { params: idParam } }, controller.getReturnById);
  fastify.post("/", { preHandler: receiverAccess, schema: { body: createReturnBody } }, controller.createReturn);
  const statusAccess = [
    protect,
    requireRole("ADMIN", "PURCHASE_MANAGER", "DEPOT_MANAGER", "STOCK_MANAGER", "COMMERCIAL_MANAGER"),
  ];

  fastify.patch(
    "/:id/status",
    { preHandler: statusAccess, schema: { params: idParam, body: updateReturnStatusBody } },
    controller.updateReturnStatus
  );
}

module.exports = purchaseReturnRoutes;
