const avanceService = require("../services/avance.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");

const HR      = requireRole("HR_MANAGER");
const HR_FIN  = requireRole("HR_MANAGER", "FINANCE_MANAGER", "ADMIN");

async function avanceRoutes(fastify) {
  // Create avance request  POST /api/avances  (HR only)
  fastify.post("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { employeeId, employeeName, department, amount, reason } = req.body;
      if (!employeeId || !amount || !reason)
        return error(reply, "employeeId, amount and reason are required", 400);
      const avance = await avanceService.createAvance({ employeeId, employeeName, department, amount, reason });
      return success(reply, avance, 201);
    } catch (err) { return error(reply, err.message, 500); }
  });

  // List avances  GET /api/avances  (HR + Finance)
  fastify.get("/", { preHandler: [protect, HR_FIN] }, async (req, reply) => {
    try {
      return success(reply, await avanceService.getAvances(req.query));
    } catch (err) { return error(reply, err.message, 500); }
  });

  // Approve & deduct  PATCH /api/avances/:id/approve  (HR + Finance)
  fastify.patch("/:id/approve", { preHandler: [protect, HR_FIN] }, async (req, reply) => {
    try {
      const result = await avanceService.approveAndDeduct(req.params.id, req.user.name);
      return success(reply, result);
    } catch (err) { return error(reply, err.message, 400); }
  });

  // Decline  PATCH /api/avances/:id/decline  (HR + Finance)
  fastify.patch("/:id/decline", { preHandler: [protect, HR_FIN] }, async (req, reply) => {
    try {
      const reason = req.body?.reason || "";
      const result = await avanceService.declineAvance(req.params.id, req.user.name, reason);
      return success(reply, result);
    } catch (err) { return error(reply, err.message, 400); }
  });

  // Delete avance  DELETE /api/avances/:id  (HR only)
  fastify.delete("/:id", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      await avanceService.deleteAvance(req.params.id);
      return success(reply, { message: "Deleted" });
    } catch (err) { return error(reply, err.message, 500); }
  });
}

module.exports = avanceRoutes;