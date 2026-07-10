const { protect, requireRole } = require("../../../hooks/auth.hook");
const documentController = require("../controllers/document.controller");

async function documentRoutes(fastify) {
  const access     = [protect, requireRole("ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER")];
  const adminOnly  = [protect, requireRole("ADMIN")];

  fastify.get("/",                { preHandler: access },    documentController.getAll);
  fastify.get("/stats",           { preHandler: access },    documentController.stats);
  fastify.get("/:id/download",    { preHandler: access },    documentController.download);
  fastify.post("/",               { preHandler: access },    documentController.upload);
  fastify.post("/otp/generate",   { preHandler: adminOnly }, documentController.generateOtp);
  fastify.delete("/:id",          { preHandler: access },    documentController.remove);
}

module.exports = documentRoutes;
