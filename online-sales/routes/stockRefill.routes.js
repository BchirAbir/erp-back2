// online-sales/routes/stockRefill.routes.js
const { protect, requireRole } = require("../../hooks/auth.hook");
const svc = require("../services/stockRefill.service");
const {
  idParam,
  createRefillBody,
  updateRefillStatusBody,
  listRefillQuery,
} = require("../schemas/stockRefill.schema");

const auth = { preHandler: [protect, requireRole("SALES_MANAGER", "ADMIN", "STOCK_MANAGER")] };

async function stockRefillRoutes(fastify) {

  // GET /api/online-sales/refill?status=&page=&limit=
  fastify.get("/", { ...auth, schema: { querystring: listRefillQuery } }, async (req, reply) => {
    try {
      const { status = "all", page = 1, limit = 50 } = req.query;
      return reply.send(await svc.getAll({ status, page: Number(page), limit: Number(limit) }));
    } catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // GET /api/online-sales/refill/stats
  fastify.get("/stats", auth, async (req, reply) => {
    try { return reply.send(await svc.getStats()); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // GET /api/online-sales/refill/:id
  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try {
      const r = await svc.getById(req.params.id);
      if (!r) return reply.code(404).send({ message: "Refill request not found" });
      return reply.send(r);
    } catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // GET /api/online-sales/refill/:id/availability
  // Check if warehouse currently has enough stock to fulfill this request
  fastify.get("/:id/availability", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try {
      return reply.send(await svc.checkAvailability(req.params.id));
    } catch (e) { return reply.code(e.statusCode || 500).send({ message: e.message }); }
  });

  // POST /api/online-sales/refill
  fastify.post("/", { ...auth, schema: { body: createRefillBody } }, async (req, reply) => {
    try {
      const { productIds, quantities = {}, priority, notes } = req.body;
      const requestedBy = req.user?.name || req.user?.email || "";
      const r = await svc.create({ productIds, quantities, priority, notes, requestedBy });
      return reply.code(201).send(r);
    } catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });

  // PATCH /api/online-sales/refill/:id/status
  fastify.patch("/:id/status", { ...auth, schema: { params: idParam, body: updateRefillStatusBody } }, async (req, reply) => {
    try {
      const { status, adminNotes = "" } = req.body;
      const r = await svc.updateStatus(req.params.id, status, adminNotes);
      return reply.send(r);
    } catch (e) {
      // 409 = insufficient stock — send back availability details so frontend can show them
      if (e.statusCode === 409) {
        return reply.code(409).send({
          message:      e.message,
          insufficient: e.insufficient || [],
          availability: e.availability || [],
        });
      }
      return reply.code(e.statusCode || 400).send({ message: e.message });
    }
  });

  // POST /api/online-sales/refill/retry-pending
  // Called after a new stock movement — checks which pending requests can now be satisfied
  fastify.post("/retry-pending", { preHandler: [protect, requireRole("STOCK_MANAGER", "ADMIN")] }, async (req, reply) => {
    try {
      return reply.send(await svc.retryPendingAfterRestock());
    } catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // DELETE /api/online-sales/refill/:id
  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try { await svc.remove(req.params.id); return reply.code(204).send(); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });
}

module.exports = stockRefillRoutes;