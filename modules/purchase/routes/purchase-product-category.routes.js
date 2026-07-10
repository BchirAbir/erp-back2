const { protect, requireRole } = require("../../../hooks/auth.hook");
const ctrl = require("../controllers/purchase-product-category.controller");

async function purchaseProductCategoryRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/",        { preHandler: access }, ctrl.getAll);
  fastify.post("/",       { preHandler: access }, ctrl.create);
  fastify.patch("/:id",   { preHandler: access }, ctrl.update);
  fastify.delete("/:id",  { preHandler: access }, ctrl.remove);
}

module.exports = purchaseProductCategoryRoutes;
