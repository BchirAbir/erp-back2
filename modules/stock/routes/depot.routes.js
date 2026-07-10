const { protect, requireRole } = require("../../../hooks/auth.hook");
const depotController = require("../controllers/depot.controller");
const {
  idParam,
  createDepotBody,
  updateDepotBody,
} = require("../schemas/depot.schema");

async function depotRoutes(fastify) {
  const stockReadAccess = [
    protect,
    requireRole("ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER", "COMMERCIAL_MANAGER", "PURCHASE_MANAGER"),
  ];
  const stockManageAccess = [protect, requireRole("STOCK_MANAGER")];

  fastify.get(
    "/",
    { preHandler: stockReadAccess },
    depotController.getAllDepots
  );

  fastify.get(
    "/mine",
    { preHandler: [protect, requireRole("ADMIN", "DEPOT_MANAGER", "STOCK_MANAGER")] },
    depotController.getMyDepot
  );

  fastify.get(
    "/:id",
    { preHandler: stockReadAccess, schema: { params: idParam } },
    depotController.getDepotById
  );

  fastify.post(
    "/",
    { preHandler: stockManageAccess, schema: { body: createDepotBody } },
    depotController.createDepot
  );

  fastify.put(
    "/:id",
    {
      preHandler: stockManageAccess,
      schema: { params: idParam, body: updateDepotBody },
    },
    depotController.updateDepot
  );

  fastify.delete(
    "/:id",
    { preHandler: stockManageAccess, schema: { params: idParam } },
    depotController.deleteDepot
  );
}

module.exports = depotRoutes;
