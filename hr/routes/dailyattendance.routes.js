// routes/dailyAttendance.routes.js — Daily Check-in / Check-out
const svc = require("../services/dailyattendance.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");

const HR = requireRole("HR_MANAGER");

async function dailyAttendanceRoutes(fastify) {

  // GET /api/daily-attendance
  fastify.get("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      return success(reply, await svc.getRecords(req.query));
    } catch (e) { return error(reply, e.message, 500); }
  });

  // GET /api/daily-attendance/summary?month=YYYY-MM
  fastify.get("/summary", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { month, department } = req.query;
      if (!month) return error(reply, "month (YYYY-MM) required", 400);
      return success(reply, await svc.getMonthlySummary(month, department));
    } catch (e) { return error(reply, e.message, 500); }
  });

  // POST /api/daily-attendance — upsert one record
  fastify.post("/", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      const { employeeId, date, checkIn, checkOut, isAbsent, note } = req.body;
      if (!employeeId || !date)
        return error(reply, "employeeId and date required", 400);
      const DailyAttendance = require("../../models/DailyAttendance");
      const existing = await DailyAttendance.findOne({ employeeId, date });
      const record = await svc.upsertRecord({
        employeeId, date, checkIn, checkOut, isAbsent, note,
        recordedBy: req.user?.name || req.user?.email,
      });
      const statusCode = existing ? 200 : 201;
      return success(reply, record, statusCode);
    } catch (e) { return error(reply, e.message, 500); }
  });

  // DELETE /api/daily-attendance/:id
  fastify.delete("/:id", { preHandler: [protect, HR] }, async (req, reply) => {
    try {
      await svc.deleteRecord(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message, 500); }
  });
}

module.exports = dailyAttendanceRoutes;