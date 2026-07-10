const { protect, requireRole } = require("../../../hooks/auth.hook");
const carrierController = require("../controllers/carrier.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const carrierBody = {
  type: "object",
  required: ["name", "code"],
  properties: {
    name: { type: "string", minLength: 1 },
    code: { type: "string", minLength: 1 },
    contactEmail: { type: "string" },
    contactPhone: { type: "string" },
    baseRateFlat: { type: "number", minimum: 0 },
    transitDays: { type: "number", minimum: 0 },
    notes: { type: "string" },
  },
};

async function carrierRoutes(fastify) {
  const managerAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];
  const readAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "WAREHOUSE_OPERATOR")];

  fastify.get("/", { preHandler: readAccess }, carrierController.getAll);
  fastify.get("/active", { preHandler: readAccess }, carrierController.getActive);
  fastify.get("/:id", { preHandler: readAccess, schema: { params: idParam } }, carrierController.getById);
  fastify.post("/", { preHandler: managerAccess, schema: { body: carrierBody } }, carrierController.create);
  fastify.put("/:id", { preHandler: managerAccess, schema: { params: idParam } }, carrierController.update);
  fastify.post("/:id/toggle", { preHandler: managerAccess, schema: { params: idParam } }, carrierController.toggleActive);
}

module.exports = carrierRoutes;
