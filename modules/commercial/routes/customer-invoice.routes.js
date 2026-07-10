const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/customer-invoice.controller");
const {
  idParam,
  orderIdParam,
  invoiceConfigBody,
  registerPaymentBody,
  clearChequePaymentBody,
  sendInvoiceBody,
  sendReminderBody,
} = require("../schemas/customer-invoice.schema");

async function customerInvoiceRoutes(fastify) {
  const readAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "FINANCE_MANAGER")];
  const commercialWrite = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER")];
  const financeWrite = [protect, requireRole("ADMIN", "FINANCE_MANAGER")];

  fastify.get("/", { preHandler: readAccess }, controller.getAllInvoices);
  fastify.get(
    "/:id",
    { preHandler: readAccess, schema: { params: idParam } },
    controller.getInvoiceById
  );
  fastify.get(
    "/by-order/:orderId",
    { preHandler: readAccess, schema: { params: orderIdParam } },
    controller.getInvoiceByOrderId
  );
  fastify.post(
    "/:id/send",
    { preHandler: commercialWrite, schema: { params: idParam, body: sendInvoiceBody } },
    controller.sendInvoice
  );
  fastify.patch(
    "/:id/configure",
    { preHandler: financeWrite, schema: { params: idParam, body: invoiceConfigBody } },
    controller.configureInvoice
  );
  fastify.post(
    "/:id/finalize",
    { preHandler: financeWrite, schema: { params: idParam, body: invoiceConfigBody } },
    controller.finalizeInvoice
  );
  fastify.post(
    "/:id/payments",
    { preHandler: financeWrite, schema: { params: idParam, body: registerPaymentBody } },
    controller.registerPayment
  );
  fastify.post(
    "/:id/remind",
    { preHandler: financeWrite, schema: { params: idParam, body: sendReminderBody } },
    controller.sendReminder
  );
  fastify.post(
    "/:id/clear-cheque",
    { preHandler: financeWrite, schema: { params: idParam, body: clearChequePaymentBody } },
    controller.clearChequePayment
  );

  fastify.get("/kumbil", { preHandler: financeWrite }, controller.getAllKumbilInvoices);

  const installmentParam = {
    type: "object",
    required: ["id", "index"],
    properties: {
      id: { type: "string", minLength: 24, maxLength: 24 },
      index: { type: "string", pattern: "^\\d+$" },
    },
  };
  fastify.delete(
    "/:id/installments/:index",
    { preHandler: financeWrite, schema: { params: installmentParam } },
    controller.cancelInstallment
  );
}

module.exports = customerInvoiceRoutes;
