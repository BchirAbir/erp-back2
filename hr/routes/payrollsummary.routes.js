// hr/routes/payrollSummary.routes.js
// Exposes HR payroll data for Finance module consumption.
// Finance calls: GET /api/payroll/summary?month=YYYY-MM

const svc                      = require("../services/payrollsummary.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");

// HR Manager, Admin, and Finance Manager can access
const allowed = requireRole("HR_MANAGER", "ADMIN", "FINANCE_MANAGER");

async function payrollSummaryRoutes(fastify) {

  // GET /api/payroll/summary?month=YYYY-MM
  // Returns totals + per-employee breakdown for Finance
  fastify.get("/summary", { preHandler: [protect, allowed] }, async (req, reply) => {
    try {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month))
        return error(reply, "month must be in YYYY-MM format", 400);
      const data = await svc.getPayrollSummary(month);
      return success(reply, data);
    } catch (e) {
      return error(reply, e.message, 500);
    }
  });
}

module.exports = payrollSummaryRoutes;