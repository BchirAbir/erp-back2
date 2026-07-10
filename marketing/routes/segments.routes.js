const svc = require("../services/segment.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");
const { createSegmentBody, updateSegmentBody, idParam } = require("../schemas/segment.schema");

const MARKETING = requireRole("MARKETING_MANAGER", "ADMIN");

async function segmentRoutes(fastify) {

  // GET /api/segments?month=YYYY-MM&status=Growing
  fastify.get("/", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getAll(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // GET /api/segments/stats?month=YYYY-MM
  fastify.get("/stats", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getStats(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // POST /api/segments
  fastify.post("/", { preHandler: [protect, MARKETING], schema: { body: createSegmentBody } }, async (req, reply) => {
    try {
      const segment = await svc.create({ ...req.body, createdBy: req.user._id });
      return success(reply, segment, 201);
    } catch (e) { return error(reply, e.message); }
  });

  // PUT /api/segments/:id
  fastify.put("/:id", { preHandler: [protect, MARKETING], schema: { body: updateSegmentBody, params: idParam } }, async (req, reply) => {
    try {
      const segment = await svc.update(req.params.id, req.body);
      if (!segment) return error(reply, "Segment not found", 404);
      return success(reply, segment);
    } catch (e) { return error(reply, e.message); }
  });

  // DELETE /api/segments/:id
  fastify.delete("/:id", { preHandler: [protect, MARKETING], schema: { params: idParam } }, async (req, reply) => {
    try {
      await svc.remove(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message); }
  });
}

module.exports = segmentRoutes;