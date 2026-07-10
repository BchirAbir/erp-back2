const { protect, requireRole } = require("../../../hooks/auth.hook");
const ctrl = require("../controllers/cyclic-order.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const createBody = {
  type: "object",
  required: ["customerId", "customerName", "productId", "quantity", "frequencyDays", "nextDueDate"],
  properties: {
    customerId:    { type: "string", minLength: 24, maxLength: 24 },
    customerName:  { type: "string" },
    productId:     { type: "string", minLength: 24, maxLength: 24 },
    quantity:      { type: "number", minimum: 1 },
    frequencyDays: { type: "number", minimum: 1 },
    nextDueDate:   { type: "string" },
    notes:         { type: "string" },
  },
};

const updateBody = {
  type: "object",
  properties: {
    quantity:      { type: "number", minimum: 1 },
    frequencyDays: { type: "number", minimum: 1 },
    nextDueDate:   { type: "string" },
    notes:         { type: "string" },
  },
};

async function cyclicOrderRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER")];

  fastify.get("/",     { preHandler: access }, ctrl.getAll);
  fastify.get("/due",  { preHandler: access }, ctrl.getDue);
  fastify.get("/:id",  { preHandler: access, schema: { params: idParam } }, ctrl.getById);
  fastify.post("/",    { preHandler: access, schema: { body: createBody } }, ctrl.create);
  fastify.put("/:id",  { preHandler: access, schema: { params: idParam, body: updateBody } }, ctrl.update);
  fastify.post("/:id/toggle", { preHandler: access, schema: { params: idParam } }, ctrl.toggleActive);
  fastify.post("/:id/fire",   { preHandler: access, schema: { params: idParam } }, ctrl.fire);
}

module.exports = cyclicOrderRoutes;
