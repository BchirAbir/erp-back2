const { protect, requireRole } = require("../../../hooks/auth.hook");
const ctrl = require("../controllers/purchase-document.controller");

async function purchaseDocumentRoutes(fastify) {
  const access    = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];
  const adminOnly = [protect, requireRole("ADMIN")];

  fastify.get("/",              { preHandler: access },    ctrl.getAll);
  fastify.get("/stats",         { preHandler: access },    ctrl.stats);
  fastify.get("/:id/download",  { preHandler: access },    ctrl.download);
  fastify.post("/",             { preHandler: access },    ctrl.upload);
  fastify.post("/otp/generate", { preHandler: adminOnly }, ctrl.generateOtp);
  fastify.delete("/:id",        { preHandler: access },    ctrl.remove);
}

module.exports = purchaseDocumentRoutes;
