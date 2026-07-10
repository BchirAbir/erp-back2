// online-sales/routes/onlineOrder.routes.js
const service = require("../services/onlineOrder.service");
const { logAction } = require("../../utils/audit.util");
const { protect, requireRole } = require("../../hooks/auth.hook");
const {
  idParam, codeParam,
  createOrderBody, updateOrderBody, updateOrderStatusBody, listOrdersQuery,
} = require("../schemas/onlineOrder.schema");

async function onlineOrderRoutes(fastify) {
  const ALLOWED = requireRole("SALES_MANAGER", "ADMIN");
  const auth = { preHandler: [protect, ALLOWED] };

  // GET /api/online-sales/orders?search=&status=&page=&limit=
  fastify.get("/", { ...auth, schema: { querystring: listOrdersQuery } }, async (req, reply) => {
    const { search = "", status = "all", page = 1, limit = 50 } = req.query;
    const result = await service.getAll({
      search, status, page: Number(page), limit: Number(limit),
    });
    return reply.send(result);
  });

  // GET /api/online-sales/orders/stats
  fastify.get("/stats", auth, async (req, reply) => {
    return reply.send(await service.getStats());
  });

  // GET /api/online-sales/orders/promo/:code  — validate promotion code
  fastify.get("/promo/:code", { ...auth, schema: { params: codeParam } }, async (req, reply) => {
    try {
      const promo = await service.validatePromoCode(req.params.code);
      return reply.send(promo);
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // GET /api/online-sales/orders/:id
  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const order = await service.getById(req.params.id);
    if (!order) return reply.code(404).send({ message: "Order not found" });
    return reply.send(order);
  });

  // POST /api/online-sales/orders
  fastify.post("/", { ...auth, schema: { body: createOrderBody } }, async (req, reply) => {
    try {
      const order = await service.create(req.body, req.user._id);
      return reply.code(201).send(order);
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // PUT /api/online-sales/orders/:id
  fastify.put("/:id", { ...auth, schema: { params: idParam, body: updateOrderBody } }, async (req, reply) => {
    const order = await service.update(req.params.id, req.body);
    if (!order) return reply.code(404).send({ message: "Order not found" });
    return reply.send(order);
  });

  // PATCH /api/online-sales/orders/:id/status
  fastify.patch("/:id/status", { ...auth, schema: { params: idParam, body: updateOrderStatusBody } }, async (req, reply) => {
    const { status } = req.body;
    try {
      const userId = req.user?._id ?? null;
      const order  = await service.updateStatus(req.params.id, status, userId);
      return reply.send(order);
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // POST /api/online-sales/orders/:id/sync-tracking
  fastify.post("/:id/sync-tracking", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try {
      const order = await service.syncTracking(req.params.id);
      return reply.send(order);
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // DELETE /api/online-sales/orders/:id
  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const existing = await service.getById(req.params.id);
    if (!existing) return reply.code(404).send({ message: "Order not found" });
    await service.remove(req.params.id);
    await logAction(req.user, "DELETE_ORDER", existing.orderNo, {
      department: "Online Sales",
      customer:   existing.customer?.name,
      amount:     existing.totalAmount,
    });
    return reply.code(204).send();
  });
}

module.exports = onlineOrderRoutes;