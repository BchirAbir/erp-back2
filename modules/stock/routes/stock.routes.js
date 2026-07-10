const { protect, requireRole } = require("../../../hooks/auth.hook");
const stockController = require("../controllers/stock.controller");
const depotController = require("../controllers/depot.controller");
const {
  objectIdParam,
  entryBody,
  exitBody,
  reservationBody,
  releaseReservationBody,
  deductReservationBody,
} = require("../schemas/stock.schema");

async function stockRoutes(fastify) {
  const adminOnly = [protect, requireRole("ADMIN")];
  const stockAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER")];
  const stockReadAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER", "DEPOT_MANAGER")];
  const stockOrDepot = [protect, requireRole("ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER")];
  const depotAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER")];

  // Returns users with DEPOT_MANAGER role — used by STOCK_MANAGER when creating/editing depots
  fastify.get(
    "/depot-managers",
    { preHandler: stockAccess },
    depotController.getDepotManagers
  );

  fastify.get(
    "/items",
    { preHandler: stockReadAccess, schema: { tags: ["Stock"] } },
    stockController.getAllStockItems
  );

  fastify.get(
    "/items/:productId",
    { preHandler: stockReadAccess, schema: { params: objectIdParam, tags: ["Stock"] } },
    stockController.getStockItemByProductId
  );

  fastify.get(
    "/availability-by-depot",
    { preHandler: stockReadAccess, schema: { tags: ["Stock"] } },
    stockController.getDepotAvailability
  );

  fastify.get(
    "/movements",
    { preHandler: stockOrDepot, schema: { tags: ["Stock"] } },
    stockController.getAllMovements
  );

  fastify.get(
    "/movements/:productId",
    { preHandler: stockOrDepot, schema: { params: objectIdParam, tags: ["Stock"] } },
    stockController.getMovementHistory
  );

  fastify.post(
    "/movements/entry",
    { preHandler: depotAccess, schema: { body: entryBody, tags: ["Stock"] } },
    stockController.createEntry
  );

  fastify.post(
    "/movements/exit",
    { preHandler: depotAccess, schema: { body: exitBody, tags: ["Stock"] } },
    stockController.createExit
  );

  fastify.post(
    "/reservations",
    { preHandler: stockAccess, schema: { body: reservationBody, tags: ["Stock"] } },
    stockController.reserveStock
  );

  fastify.post(
    "/reservations/release",
    { preHandler: stockAccess, schema: { body: releaseReservationBody, tags: ["Stock"] } },
    stockController.releaseReservation
  );

  fastify.post(
    "/reservations/deduct",
    { preHandler: stockAccess, schema: { body: deductReservationBody, tags: ["Stock"] } },
    stockController.deductReservedStock
  );
}

module.exports = stockRoutes;
