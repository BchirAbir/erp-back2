// routes/attendance.routes.js — Leave Requests
const svc = require("../services/attendance.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");
const { logAction } = require("../../utils/audit.util");
const User = require("../../models/User");

const HR = requireRole("HR_MANAGER");

async function attendanceRoutes(fastify) {

  // GET /api/attendance
  fastify.get("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      return success(reply, await svc.getRequests(req.query));
    } catch (e) { return error(reply, e.message, 500); }
  });

  // POST /api/attendance — submit a leave request
  fastify.post("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { employeeId, date, type, hours, note } = req.body;
      if (!employeeId || !date || !type)
        return error(reply, "employeeId, date, type required", 400);
      const record = await svc.createRequest({ employeeId, date, type, hours, note });

      // Log the leave action
      try {
        const emp = await User.findById(employeeId).select("name department");
        if (emp) {
          await logAction(req.user, "ADD_LEAVE", emp.name, {
            department: emp.department,
            leaveType: type,
            date,
          });
        }
      } catch {}

      return success(reply, record, 201);
    } catch (e) { return error(reply, e.message, 500); }
  });

  // POST /api/attendance/approve-all
  fastify.post("/approve-all", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      return success(reply, await svc.approveAll(req.user?.name));
    } catch (e) { return error(reply, e.message, 500); }
  });

  // PATCH /api/attendance/:id — approve or reject
  fastify.patch("/:id", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { status } = req.body;
      if (!["Approved", "Rejected", "Pending"].includes(status))
        return error(reply, "Invalid status", 400);
      return success(reply, await svc.updateStatus(req.params.id, status, req.user?.name));
    } catch (e) { return error(reply, e.message, 500); }
  });

  // DELETE /api/attendance/:id
  fastify.delete("/:id", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      await svc.deleteRequest(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message, 500); }
  });
}

module.exports = attendanceRoutes;
