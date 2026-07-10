const { protect, requireRole } = require("../../../hooks/auth.hook");
const ctrl = require("../controllers/delivery-plan.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createBody = {
  type: "object",
  required: ["planDate"],
  properties: {
    planDate: { type: "string" },
    vehicleId: { type: "string", minLength: 24, maxLength: 24 },
    carrierId: { type: "string", minLength: 24, maxLength: 24 },
    zone: { type: "string" },
    startDate: { type: "string" },
    fuelAddedLiters: { type: "number", minimum: 0 },
    orderIds: { type: "array", items: { type: "string" } },
    livreurName: { type: "string" },
    notes: { type: "string" },
    planType: { type: "string", enum: ["SHIPMENT", "DISCOVER"] },
  },
};

const returnBody = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: { type: "string", minLength: 1 },
    orderId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

async function deliveryPlanRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, ctrl.getAll);
  fastify.get("/unassigned", { preHandler: access }, ctrl.getUnassignedOrders);
  fastify.get("/discovered-zones", { preHandler: access }, ctrl.getDiscoveredZones);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, ctrl.getById);
  fastify.post("/", { preHandler: access, schema: { body: createBody } }, ctrl.create);
  fastify.post("/:id/start", { preHandler: access, schema: { params: idParam } }, ctrl.startDelivery);
  fastify.post("/:id/complete", { preHandler: access, schema: { params: idParam } }, ctrl.complete);
  fastify.post(
    "/:id/return",
    { preHandler: access, schema: { params: idParam, body: returnBody } },
    ctrl.returnPlan
  );
  fastify.post("/:id/cancel", { preHandler: access, schema: { params: idParam } }, ctrl.cancel);
}

module.exports = deliveryPlanRoutes;
