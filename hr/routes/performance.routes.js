// routes/performance.routes.js
const svc = require("../services/performance.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error, notFound } = require("../../utils/response");

const HR = requireRole("HR_MANAGER");

async function performanceRoutes(fastify) {

  // GET /api/performance?cycle=&department=&rating=&employeeId=
  fastify.get("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      return success(reply, await svc.getAll(req.query));
    } catch (e) { return error(reply, e.message); }
  });

  // GET /api/performance/stats?cycle=
  fastify.get("/stats", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      return success(reply, await svc.getStats(req.query.cycle));
    } catch (e) { return error(reply, e.message); }
  });

  // POST /api/performance — create or update (upsert by employeeId + cycle)
  fastify.post("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { employeeId, cycle, score, notes, reviewDate, managerId } = req.body;
      if (!employeeId || !cycle || score === undefined)
        return error(reply, "employeeId, cycle, and score are required", 400);
      if (score < 0 || score > 100)
        return error(reply, "score must be between 0 and 100", 400);
      const record = await svc.upsert({ employeeId, cycle, score, notes, reviewDate, managerId });
      return success(reply, record, 201);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // DELETE /api/performance/:id
  fastify.delete("/:id", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const deleted = await svc.delete(req.params.id);
      if (!deleted) return notFound(reply, "Evaluation not found");
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message); }
  });
}

module.exports = performanceRoutes;
