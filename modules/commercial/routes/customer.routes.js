const { protect, requireRole } = require("../../../hooks/auth.hook");
const customerController = require("../controllers/customer.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const customerBody = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string" },
    phone: { type: "string" },
    address: { type: "string" },
    city: { type: "string" },
    continent: { type: "string" },
    country: { type: "string" },
    state: { type: "string" },
    mf: { type: "string" },
    notes: { type: "string" },
  },
};

async function customerRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "WAREHOUSE_OPERATOR")];
  const writeAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, customerController.getAll);
  fastify.get("/active", { preHandler: access }, customerController.getActive);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, customerController.getById);
  fastify.post("/", { preHandler: writeAccess, schema: { body: customerBody } }, customerController.create);
  fastify.put("/:id", { preHandler: writeAccess, schema: { params: idParam } }, customerController.update);
  fastify.post("/:id/toggle", { preHandler: writeAccess, schema: { params: idParam } }, customerController.toggleActive);
}

module.exports = customerRoutes;
