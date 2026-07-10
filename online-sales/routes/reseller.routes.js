// online-sales/routes/reseller.routes.js
const { protect, requireRole } = require("../../hooks/auth.hook");
const service = require("../services/reseller.service");
const {
  idParam, requestIdParam,
  createResellerBody, updateResellerBody, updateResellerStatusBody,
  resetPasswordBody, createRequestBody, updateRequestStatusBody,
  listResellersQuery, listRequestsQuery,
} = require("../schemas/reseller.schema");

const auth = { preHandler: [protect, requireRole("SALES_MANAGER", "ADMIN")] };

async function resellerRoutes(fastify) {

  // ── Stats ──────────────────────────────────────────────────────────────────
  fastify.get("/stats", auth, async (req, reply) => {
    try { return reply.send(await service.getStats()); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // ── Resellers ──────────────────────────────────────────────────────────────
  fastify.get("/", { ...auth, schema: { querystring: listResellersQuery } }, async (req, reply) => {
    const { search = "", status = "all" } = req.query;
    try { return reply.send(await service.getAll({ search, status })); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try {
      const data = await service.getById(req.params.id);
      if (!data) return reply.code(404).send({ message: "Reseller not found" });
      return reply.send(data);
    } catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  fastify.post("/", { ...auth, schema: { body: createResellerBody } }, async (req, reply) => {
    try { return reply.code(201).send(await service.create(req.body, req.user._id)); }
    catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });

  fastify.patch("/:id", { ...auth, schema: { params: idParam, body: updateResellerBody } }, async (req, reply) => {
    try { return reply.send(await service.update(req.params.id, req.body)); }
    catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });

  fastify.patch("/:id/status", { ...auth, schema: { params: idParam, body: updateResellerStatusBody } }, async (req, reply) => {
    const { status } = req.body;
    try { return reply.send(await service.setStatus(req.params.id, status)); }
    catch (e) { return reply.code(400).send({ message: e.message }); }
  });

  fastify.patch("/:id/reset-password", { ...auth, schema: { params: idParam, body: resetPasswordBody } }, async (req, reply) => {
    const { newPassword } = req.body;
    try { return reply.send(await service.resetPassword(req.params.id, newPassword)); }
    catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });

  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    try { await service.remove(req.params.id); return reply.send({ ok: true }); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  // ── Purchase Requests ──────────────────────────────────────────────────────
  fastify.get("/requests/all", { ...auth, schema: { querystring: listRequestsQuery } }, async (req, reply) => {
    const { search = "", status = "all", resellerId } = req.query;
    try { return reply.send(await service.getAllRequests({ search, status, resellerId })); }
    catch (e) { return reply.code(500).send({ message: e.message }); }
  });

  fastify.post("/:id/requests", { ...auth, schema: { params: idParam, body: createRequestBody } }, async (req, reply) => {
    try { return reply.code(201).send(await service.createRequest(req.params.id, req.body)); }
    catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });

  fastify.patch("/requests/:requestId/status", { ...auth, schema: { params: requestIdParam, body: updateRequestStatusBody } }, async (req, reply) => {
    const { status, adminNotes } = req.body;
    try { return reply.send(await service.updateRequestStatus(req.params.requestId, status, adminNotes, req.user._id)); }
    catch (e) { return reply.code(e.statusCode || 400).send({ message: e.message }); }
  });
}

module.exports = resellerRoutes;