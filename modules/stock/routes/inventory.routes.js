const { protect, requireRole } = require("../../../hooks/auth.hook");
const inventoryController = require("../controllers/inventory.controller");
const {
  idParam,
  lineIdParam,
  createInventoryBody,
  addLineBody,
  submitDepotCountBody,
  submitDepotResponseBody,
} = require("../schemas/inventory.schema");

async function inventoryRoutes(fastify) {
  const canRead  = [protect, requireRole("ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER")];
  const canStock = [protect, requireRole("ADMIN", "STOCK_MANAGER")];
  const canDepot = [protect, requireRole("ADMIN", "DEPOT_MANAGER")];

  // Sessions
  fastify.get("/",    { preHandler: canRead },   inventoryController.getAllInventories);
  fastify.get("/:id", { preHandler: canRead,   schema: { params: idParam } }, inventoryController.getInventoryById);
  fastify.post("/",   { preHandler: canStock,  schema: { body: createInventoryBody } }, inventoryController.createInventory);

  // Lines
  fastify.get( "/:id/lines",            { preHandler: canRead,  schema: { params: idParam } },       inventoryController.getInventoryLines);
  fastify.post("/:id/lines",            { preHandler: canStock, schema: { params: idParam, body: addLineBody } }, inventoryController.addInventoryLine);
  fastify.delete("/:id/lines/:lineId",  { preHandler: canStock, schema: { params: lineIdParam } },   inventoryController.removeInventoryLine);

  // Stock Manager workflow
  fastify.post("/:id/send-to-depot", { preHandler: canStock, schema: { params: idParam } }, inventoryController.sendToDepot);
  fastify.post("/:id/approve",       { preHandler: canStock, schema: { params: idParam } }, inventoryController.approveInventory);
  fastify.post("/:id/reject",        { preHandler: canStock, schema: { params: idParam } }, inventoryController.rejectInventory);

  // Depot Manager workflow
  fastify.post("/:id/submit-count",    { preHandler: canDepot, schema: { params: idParam, body: submitDepotCountBody } }, inventoryController.submitDepotCount);
  fastify.post("/:id/depot-response",  { preHandler: canDepot, schema: { params: idParam, body: submitDepotResponseBody } }, inventoryController.submitDepotResponse);
}

module.exports = inventoryRoutes;
