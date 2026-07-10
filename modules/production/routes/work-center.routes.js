const { protect, requireRole } = require("../../../hooks/auth.hook");
const workCenterController = require("../controllers/work-center.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const workCenterBody = {
  type: "object",
  required: ["name", "code"],
  properties: {
    name: { type: "string", minLength: 1 },
    code: { type: "string", minLength: 1 },
    type: { type: "string", enum: ["MACHINE", "ASSEMBLY", "QUALITY_CHECK", "PACKAGING"] },
    capacityPerDay: { type: "number", minimum: 1 },
    notes: { type: "string" },
  },
};

const scheduleQuery = {
  type: "object",
  required: ["from", "to"],
  properties: {
    from: { type: "string" },
    to: { type: "string" },
  },
};

async function workCenterRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER")];
  const writeAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, workCenterController.getAll);
  fastify.get("/active", { preHandler: access }, workCenterController.getActive);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, workCenterController.getById);
  fastify.get(
    "/:id/schedule",
    { preHandler: access, schema: { params: idParam, querystring: scheduleQuery } },
    workCenterController.getSchedule
  );
  fastify.post("/", { preHandler: writeAccess, schema: { body: workCenterBody } }, workCenterController.create);
  fastify.put("/:id", { preHandler: writeAccess, schema: { params: idParam } }, workCenterController.update);
  fastify.post("/:id/toggle", { preHandler: writeAccess, schema: { params: idParam } }, workCenterController.toggleActive);
}

module.exports = workCenterRoutes;
