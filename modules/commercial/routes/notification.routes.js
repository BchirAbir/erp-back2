const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/notification.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

async function notificationRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAll);
  fastify.post("/:id/read", { preHandler: access, schema: { params: idParam } }, controller.markRead);
}

module.exports = notificationRoutes;
