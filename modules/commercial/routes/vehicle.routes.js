const { protect, requireRole } = require("../../../hooks/auth.hook");
const vehicleController = require("../controllers/vehicle.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const vehicleBody = {
  type: "object",
  required: ["matricule", "capacityKg", "capacityPackets", "purchaseDate"],
  properties: {
    matricule: { type: "string", minLength: 1 },
    capacityKg: { type: "number", minimum: 0 },
    capacityPackets: { type: "number", minimum: 0 },
    purchaseDate: { type: "string" },
    fuelType: { type: "string" },
    fuelCapacityLiters: { type: "number", minimum: 0 },
    durabilityPercent: { type: "number", minimum: 0, maximum: 100 },
    notes: { type: "string" },
  },
};

async function vehicleRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "WAREHOUSE_OPERATOR")];
  const writeAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, vehicleController.getAll);
  fastify.get("/active", { preHandler: access }, vehicleController.getActive);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, vehicleController.getById);
  fastify.get("/:id/deliveries", { preHandler: access, schema: { params: idParam } }, vehicleController.getDeliveries);
  fastify.post("/", { preHandler: writeAccess, schema: { body: vehicleBody } }, vehicleController.create);
  fastify.put("/:id", { preHandler: writeAccess, schema: { params: idParam } }, vehicleController.update);
  fastify.post("/:id/toggle", { preHandler: writeAccess, schema: { params: idParam } }, vehicleController.toggleActive);
}

module.exports = vehicleRoutes;
