const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/finance.controller");

async function financeRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "FINANCE_MANAGER")];

  fastify.get("/dashboard", { preHandler: access }, controller.getDashboard);
  fastify.get("/receivables", { preHandler: access }, controller.getReceivables);
  fastify.get("/payables", { preHandler: access }, controller.getPayables);
  fastify.get("/treasury", { preHandler: access }, controller.getTreasury);
  fastify.get("/entries", { preHandler: access }, controller.getEntries);
  fastify.get("/journal", { preHandler: access }, controller.getJournal);
  fastify.get("/accounts", { preHandler: access }, controller.getAccounts);
  fastify.get("/accounts/:code", { preHandler: access }, controller.getAccountLedger);
  fastify.get("/reports", { preHandler: access }, controller.getReports);
  fastify.get("/reports/department-expenses", { preHandler: access }, controller.getDepartmentExpenses);
  fastify.get("/reports/sales", { preHandler: access }, controller.getSalesReport);

  // TEJ
  fastify.patch("/invoices/:id/tej", { preHandler: access }, controller.updateInvoiceTej);

  // Manual journal entries
  fastify.get("/manual-entries", { preHandler: access }, controller.getManualEntries);
  fastify.post("/manual-entries", { preHandler: access }, controller.createManualEntry);
  fastify.delete("/manual-entries/:id", { preHandler: access }, controller.deleteManualEntry);

  // TVA declaration
  fastify.get("/tva-declaration", { preHandler: access }, controller.getTvaDeclaration);

  // Retenue à la source
  fastify.get("/rs", { preHandler: access }, controller.getRsPayments);

  // Calendar (also accessible by PURCHASE_MANAGER for outflow tracking)
  const calendarAccess = [protect, requireRole("ADMIN", "FINANCE_MANAGER", "PURCHASE_MANAGER")];
  fastify.get("/calendar", { preHandler: calendarAccess }, controller.getCalendar);

  // Company settings — readable by any authenticated user (needed across modules
  // to print devis/factures/reports); only ADMIN/FINANCE_MANAGER may update.
  fastify.get("/settings", { preHandler: [protect] }, controller.getSettings);
  fastify.put("/settings", { preHandler: access }, controller.updateSettings);

  // Pay a supplier invoice from Finance
  fastify.post("/payables/:id/pay", { preHandler: access }, controller.payPayable);

  // Resync finance entries from source documents (repairs amount=0 entries)
  fastify.post("/resync", { preHandler: access }, controller.resyncFinanceEntries);
}

module.exports = financeRoutes;
