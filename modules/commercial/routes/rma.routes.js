const { protect, requireRole } = require("../../../hooks/auth.hook");
const rmaController = require("../controllers/rma.controller");
const { idParam, createRmaBody, processRmaBody } = require("../schemas/rma.schema");

module.exports = async (fastify) => {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, rmaController.getAll);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, rmaController.getById);
  fastify.post("/", { preHandler: access, schema: { body: createRmaBody } }, rmaController.create);
  fastify.post("/:id/receive", { preHandler: access, schema: { params: idParam } }, rmaController.receive);
  fastify.post(
    "/:id/process",
    { preHandler: access, schema: { params: idParam, body: processRmaBody } },
    rmaController.process
  );
  fastify.post("/:id/close", { preHandler: access, schema: { params: idParam } }, rmaController.close);
  fastify.post("/:id/cancel", { preHandler: access, schema: { params: idParam } }, rmaController.cancel);
};
