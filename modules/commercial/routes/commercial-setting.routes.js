const { protect, requireRole } = require("../../../hooks/auth.hook");
const ctrl = require("../controllers/commercial-setting.controller");

const managerOnly = { preHandler: [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")] };

module.exports = async (fastify) => {
  fastify.get("/", managerOnly, ctrl.get);
  fastify.put("/", managerOnly, ctrl.update);
};
