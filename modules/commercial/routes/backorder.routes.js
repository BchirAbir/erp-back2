const { protect, requireRole } = require("../../../hooks/auth.hook");
const backOrderController = require("../controllers/backorder.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

module.exports = async (fastify) => {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, backOrderController.getAll);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, backOrderController.getById);
  fastify.post("/:id/fulfill", { preHandler: access, schema: { params: idParam } }, backOrderController.fulfill);
  fastify.post("/:id/cancel", { preHandler: access, schema: { params: idParam } }, backOrderController.cancel);
  fastify.post(
    "/:id/request-production",
    { preHandler: access, schema: { params: idParam } },
    backOrderController.requestProduction
  );
  fastify.post(
    "/:id/mark-production-done",
    { preHandler: access, schema: { params: idParam } },
    backOrderController.markProductionDone
  );
};
