const { protect, requireRole } = require("../../../hooks/auth.hook");
const salesOrderController = require("../controllers/sales-order.controller");
const {
  idParam,
  createSalesOrderBody,
  shipOrderBody,
  markUrgentBody,
  rejectShipBody,
  ordonanceOrderBody,
  bulkOrdonanceOrderBody,
  requestProductionBody,
} = require("../schemas/sales-order.schema");

async function salesOrderRoutes(fastify) {
  const managerAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];
  const readAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "DEPOT_MANAGER")];
  const prepareAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "DEPOT_MANAGER")];
  const operatorAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "DEPOT_MANAGER")];

  fastify.get("/", { preHandler: readAccess }, salesOrderController.getAllOrders);

  // Paginated list (must be declared before "/:id" so it isn't treated as an id)
  fastify.get("/paginated", { preHandler: readAccess }, salesOrderController.getOrdersPaginated);

  fastify.get(
    "/:id",
    { preHandler: readAccess, schema: { params: idParam } },
    salesOrderController.getOrderById
  );

  // Creation, confirmation, cancellation, delivery: managers only
  fastify.post(
    "/",
    { preHandler: managerAccess, schema: { body: createSalesOrderBody } },
    salesOrderController.createOrder
  );

  fastify.post(
    "/:id/ordonance",
    { preHandler: managerAccess, schema: { params: idParam, body: ordonanceOrderBody } },
    salesOrderController.ordonanceOrder
  );

  fastify.post(
    "/ordonance/bulk",
    { preHandler: managerAccess, schema: { body: bulkOrdonanceOrderBody } },
    salesOrderController.ordonanceOrders
  );

  fastify.post(
    "/:id/request-production",
    { preHandler: managerAccess, schema: { params: idParam, body: requestProductionBody } },
    salesOrderController.requestProduction
  );

  fastify.post(
    "/:id/confirm",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.confirmOrder
  );

  fastify.post(
    "/:id/cancel",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.cancelOrder
  );

  fastify.post(
    "/:id/deliver",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.deliverOrder
  );

  fastify.post(
    "/:id/close",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.closeOrder
  );

  fastify.post(
    "/:id/mark-returned",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.markReturned
  );

  fastify.post(
    "/:id/reorder",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.reorder
  );

  fastify.post(
    "/:id/prepare",
    { preHandler: prepareAccess, schema: { params: idParam } },
    salesOrderController.prepareOrder
  );

  fastify.post(
    "/:id/print-picking-slip",
    { preHandler: operatorAccess, schema: { params: idParam } },
    salesOrderController.markPickingSlipPrinted
  );

  fastify.post(
    "/:id/validate-packing",
    { preHandler: operatorAccess, schema: { params: idParam } },
    salesOrderController.validatePacking
  );

  fastify.post(
    "/:id/ship",
    { preHandler: operatorAccess, schema: { params: idParam, body: shipOrderBody } },
    salesOrderController.shipOrder
  );

  // Urgency: managers only
  fastify.post(
    "/:id/mark-urgent",
    { preHandler: managerAccess, schema: { params: idParam, body: markUrgentBody } },
    salesOrderController.markUrgent
  );

  fastify.post(
    "/:id/request-approval",
    { preHandler: operatorAccess, schema: { params: idParam } },
    salesOrderController.requestShipApproval
  );

  // Approve/reject: managers only
  fastify.post(
    "/:id/approve-ship",
    { preHandler: managerAccess, schema: { params: idParam } },
    salesOrderController.approveShip
  );

  fastify.post(
    "/:id/reject-ship",
    { preHandler: managerAccess, schema: { params: idParam, body: rejectShipBody } },
    salesOrderController.rejectShip
  );
}

module.exports = salesOrderRoutes;
