const { protect, requireRole } = require("../../../hooks/auth.hook");
const productionOrderController = require("../controllers/production-order.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const timelineQuery = {
  type: "object",
  required: ["from", "to"],
  properties: { from: { type: "string" }, to: { type: "string" } },
};

const createBody = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    salesOrderId: { type: "string", minLength: 24, maxLength: 24 },
    backorderId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", minimum: 1 },
    priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
    estimatedHours: { type: "number", minimum: 0 },
    notes: { type: "string" },
  },
};

const scheduleBody = {
  type: "object",
  required: ["workCenterId", "scheduledStart", "scheduledEnd"],
  properties: {
    workCenterId: { type: "string", minLength: 24, maxLength: 24 },
    scheduledStart: { type: "string" },
    scheduledEnd: { type: "string" },
  },
};

const completeBody = {
  type: "object",
  properties: {
    completedQty: { type: "number", minimum: 1 },
  },
};

async function productionOrderRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, productionOrderController.getAll);
  fastify.get(
    "/timeline",
    { preHandler: access, schema: { querystring: timelineQuery } },
    productionOrderController.getTimeline
  );
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, productionOrderController.getById);
  fastify.post("/", { preHandler: access, schema: { body: createBody } }, productionOrderController.create);
  fastify.post(
    "/:id/schedule",
    { preHandler: access, schema: { params: idParam, body: scheduleBody } },
    productionOrderController.schedule
  );
  fastify.post("/:id/start", { preHandler: access, schema: { params: idParam } }, productionOrderController.start);
  fastify.post(
    "/:id/complete",
    { preHandler: access, schema: { params: idParam, body: completeBody } },
    productionOrderController.complete
  );
  fastify.post("/:id/cancel", { preHandler: access, schema: { params: idParam } }, productionOrderController.cancel);
  fastify.post(
    "/from-backorder/:backorderId",
    {
      preHandler: access,
      schema: {
        params: {
          type: "object",
          required: ["backorderId"],
          properties: { backorderId: { type: "string", minLength: 24, maxLength: 24 } },
        },
      },
    },
    productionOrderController.createFromBackOrder
  );
}

module.exports = productionOrderRoutes;
