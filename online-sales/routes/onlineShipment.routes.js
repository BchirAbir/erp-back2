// online-sales/routes/onlineShipment.routes.js
const service = require("../services/onlineShipment.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const {
  idParam,
  createShipmentBody, updateShipmentBody, updateShipmentStatusBody, listShipmentsQuery,
} = require("../schemas/onlineShipment.schema");

async function onlineShipmentRoutes(fastify) {
  const ALLOWED = requireRole("SALES_MANAGER", "ADMIN");
  const auth = { preHandler: [protect, ALLOWED] };

  // GET /api/online-sales/shipments?search=&status=&page=&limit=
  fastify.get("/", { ...auth, schema: { querystring: listShipmentsQuery } }, async (req, reply) => {
    const { search = "", status = "all", page = 1, limit = 50 } = req.query;
    const result = await service.getAll({
      search, status, page: Number(page), limit: Number(limit),
    });
    return reply.send(result);
  });

  // GET /api/online-sales/shipments/stats
  fastify.get("/stats", auth, async (req, reply) => {
    const stats = await service.getStats();
    return reply.send(stats);
  });

  // GET /api/online-sales/shipments/:id
  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const shipment = await service.getById(req.params.id);
    if (!shipment) return reply.code(404).send({ message: "Shipment not found" });
    return reply.send(shipment);
  });

  // POST /api/online-sales/shipments
  fastify.post("/", { ...auth, schema: { body: createShipmentBody } }, async (req, reply) => {
    const shipment = await service.create(req.body, req.user._id);
    return reply.code(201).send(shipment);
  });

  // PUT /api/online-sales/shipments/:id
  fastify.put("/:id", { ...auth, schema: { params: idParam, body: updateShipmentBody } }, async (req, reply) => {
    const shipment = await service.update(req.params.id, req.body);
    if (!shipment) return reply.code(404).send({ message: "Shipment not found" });
    return reply.send(shipment);
  });

  // PATCH /api/online-sales/shipments/:id/status
  fastify.patch("/:id/status", { ...auth, schema: { params: idParam, body: updateShipmentStatusBody } }, async (req, reply) => {
    const { status } = req.body;
    const shipment = await service.updateStatus(req.params.id, status);
    if (!shipment) return reply.code(404).send({ message: "Shipment not found" });
    return reply.send(shipment);
  });

  // DELETE /api/online-sales/shipments/:id
  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const shipment = await service.remove(req.params.id);
    if (!shipment) return reply.code(404).send({ message: "Shipment not found" });
    return reply.code(204).send();
  });
}

module.exports = onlineShipmentRoutes;