// online-sales/routes/onlineReturn.routes.js
const service = require("../services/onlineReturn.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const {
  idParam,
  createReturnBody, updateReturnBody, updateReturnStatusBody, listReturnsQuery,
} = require("../schemas/onlineReturn.schema");

async function onlineReturnRoutes(fastify) {
  const ALLOWED = requireRole("SALES_MANAGER", "ADMIN");
  const auth = { preHandler: [protect, ALLOWED] };

  // GET /api/online-sales/returns?search=&status=&page=&limit=
  fastify.get("/", { ...auth, schema: { querystring: listReturnsQuery } }, async (req, reply) => {
    const { search = "", status = "all", page = 1, limit = 50 } = req.query;
    const result = await service.getAll({
      search, status, page: Number(page), limit: Number(limit),
    });
    return reply.send(result);
  });

  // GET /api/online-sales/returns/stats
  fastify.get("/stats", auth, async (req, reply) => {
    return reply.send(await service.getStats());
  });

  // GET /api/online-sales/returns/:id
  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const ret = await service.getById(req.params.id);
    if (!ret) return reply.code(404).send({ message: "Return not found" });
    return reply.send(ret);
  });

  // POST /api/online-sales/returns
  fastify.post("/", { ...auth, schema: { body: createReturnBody } }, async (req, reply) => {
    const ret = await service.create(req.body, req.user._id);
    return reply.code(201).send(ret);
  });

  // PUT /api/online-sales/returns/:id
  fastify.put("/:id", { ...auth, schema: { params: idParam, body: updateReturnBody } }, async (req, reply) => {
    const ret = await service.update(req.params.id, req.body);
    if (!ret) return reply.code(404).send({ message: "Return not found" });
    return reply.send(ret);
  });

  // PATCH /api/online-sales/returns/:id/status
  fastify.patch("/:id/status", { ...auth, schema: { params: idParam, body: updateReturnStatusBody } }, async (req, reply) => {
    const { status, adminNotes = "" } = req.body;
    try {
      const userId = req.user?._id ?? null;
      const ret    = await service.updateStatus(req.params.id, status, adminNotes, userId);
      return reply.send(ret);
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // DELETE /api/online-sales/returns/:id
  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const ret = await service.remove(req.params.id);
    if (!ret) return reply.code(404).send({ message: "Return not found" });
    return reply.code(204).send();
  });
}

module.exports = onlineReturnRoutes;