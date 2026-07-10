const svc = require("../services/marketingCalendar.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");

const MARKETING = requireRole("MARKETING_MANAGER", "ADMIN");
const ADMIN_ONLY = requireRole("ADMIN");

async function marketingCalendarRoutes(fastify) {

  // ── Budget ──────────────────────────────────────────────────────────────────

  // GET /api/marketing/budget/:year
  fastify.get("/budget/:year", { preHandler: [protect, MARKETING] }, async (req, reply) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year)) return error(reply, "Invalid year", 400);
    return success(reply, await svc.getBudget(year));
  } catch (e) { return error(reply, e.message, e.statusCode || 500); }
});

  // POST /api/marketing/budget/:year — Admin sets annual budget
  fastify.post("/budget/:year", { preHandler: [protect, ADMIN_ONLY] }, async (req, reply) => {
    try {
      const year = parseInt(req.params.year);
      const { annualBudget } = req.body;
      if (isNaN(year) || typeof annualBudget !== "number" || annualBudget < 0)
        return error(reply, "Invalid input", 400);
      return success(reply, await svc.setAnnualBudget(year, annualBudget, req.user._id));
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/budget/:year/allocate — Marketing Manager allocates per month
  fastify.patch("/budget/:year/allocate", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      const year = parseInt(req.params.year);
      const { allocations } = req.body; // [{ month, allocated }]
      if (!Array.isArray(allocations)) return error(reply, "allocations must be an array", 400);
      return success(reply, await svc.updateMonthlyAllocations(year, allocations));
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/budget/:year/transfer — Transfer budget between months
  fastify.patch("/budget/:year/transfer", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      const year = parseInt(req.params.year);
      const { fromMonth, toMonth, amount } = req.body;
      if (!fromMonth || !toMonth || !amount) return error(reply, "fromMonth, toMonth and amount required", 400);
      return success(reply, await svc.transferBudget(year, fromMonth, toMonth, amount));
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // ── Events ──────────────────────────────────────────────────────────────────

  // GET /api/marketing/events?monthKey=YYYY-MM
  fastify.get("/events", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      return success(reply, await svc.getEvents(req.query.monthKey));
    } catch (e) { return error(reply, e.message); }
  });

  // POST /api/marketing/events
  fastify.post("/events", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      const event = await svc.createEvent(req.body, req.user._id);
      return success(reply, event, 201);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/events/:id
  fastify.patch("/events/:id", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      const event = await svc.updateEvent(req.params.id, req.body);
      if (!event) return error(reply, "Event not found", 404);
      return success(reply, event);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // DELETE /api/marketing/events/:id
  fastify.delete("/events/:id", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      await svc.deleteEvent(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/events/:id/request-budget
  fastify.patch("/events/:id/request-budget", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      const event = await svc.requestExtraBudget(req.params.id, req.body.note);
      return success(reply, event);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/events/:id/approve-budget  (Finance approves extra budget)
  fastify.patch("/events/:id/approve-budget", { preHandler: [protect, requireRole("FINANCE_MANAGER", "ADMIN")] }, async (req, reply) => {
    try {
      const event = await svc.approveBudgetRequest(req.params.id, req.user.name);
      return success(reply, event);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/marketing/events/:id/decline-budget  (Finance declines extra budget)
  fastify.patch("/events/:id/decline-budget", { preHandler: [protect, requireRole("FINANCE_MANAGER", "ADMIN")] }, async (req, reply) => {
    try {
      const event = await svc.declineBudgetRequest(req.params.id, req.user.name, req.body?.reason || "");
      return success(reply, event);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });
}

module.exports = marketingCalendarRoutes;