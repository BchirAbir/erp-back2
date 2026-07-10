const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/emprunt.controller");

async function empruntRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "FINANCE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAll);
  fastify.get("/:id", { preHandler: access }, controller.getById);
  fastify.post("/", { preHandler: access }, controller.create);
  fastify.delete("/:id", { preHandler: access }, controller.remove);

  // Partial payments against an emprunt
  fastify.post("/:id/payments", { preHandler: access }, controller.addPayment);
  fastify.delete("/:id/payments/:paymentId", { preHandler: access }, controller.deletePayment);
}

module.exports = empruntRoutes;