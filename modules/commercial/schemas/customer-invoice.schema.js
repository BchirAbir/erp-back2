const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const orderIdParam = {
  type: "object",
  required: ["orderId"],
  properties: {
    orderId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const installmentPlan = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["DAYS_30", "DAYS_60", "DAYS_90", "CUSTOM"] },
    startDate: { type: "string", format: "date-time" },
    installmentsCount: { type: "number", minimum: 1 },
    dates: { type: "array", items: { type: "string", format: "date-time" } },
    amounts: { type: "array", items: { type: "number", minimum: 0 } },
    remainingOnly: { type: "boolean" },
  },
};

const settlementSplit = {
  type: "object",
  required: ["method", "plannedAmount"],
  properties: {
    method: { type: "string", enum: ["ESPECE", "CHEQUE", "VIREMENT", "KUMBIL"] },
    plannedAmount: { type: "number", minimum: 0.001 },
    dueDate: { type: "string", format: "date-time" },
    notes: { type: "string" },
  },
};

const invoiceConfigBody = {
  type: "object",
  properties: {
    pricingMode: { type: "string", enum: ["HT_BASED", "TTC_BASED"] },
    applyTva: { type: "boolean" },
    applyFodec: { type: "boolean" },
    paymentMethod: { type: "string", enum: ["UNSET", "ESPECE", "CHEQUE", "VIREMENT", "KUMBIL", "MIXED"] },
    dueDate: { type: "string", format: "date-time" },
    installmentPlan,
    settlementSplits: {
      type: "array",
      minItems: 1,
      items: settlementSplit,
    },
    notes: { type: "string" },
    lineOverrides: {
      type: "array",
      items: {
        type: "object",
        required: ["index", "unitPrice"],
        properties: {
          index: { type: "number", minimum: 0 },
          unitPrice: { type: "number", minimum: 0 },
        },
      },
    },
  },
};

const registerPaymentBody = {
  type: "object",
  required: ["method", "amount"],
  properties: {
    method: { type: "string", enum: ["ESPECE", "CHEQUE", "VIREMENT", "KUMBIL"] },
    amount: { type: "number", minimum: 0.001 },
    paidAt: { type: "string", format: "date-time" },
    reference: { type: "string" },
    notes: { type: "string" },
    installmentIndex: { type: "number", minimum: 0 },
    splitIndex: { type: "number", minimum: 0 },
  },
};

const clearChequePaymentBody = {
  type: "object",
  required: ["paymentId"],
  properties: {
    paymentId: { type: "string", minLength: 1 },
  },
};

const sendInvoiceBody = {
  type: "object",
  properties: {
    note: { type: "string" },
  },
};

const sendReminderBody = {
  type: "object",
  properties: {
    channel: { type: "string", enum: ["EMAIL", "PHONE", "MANUAL"] },
    note: { type: "string" },
  },
};

const cancelQuotationBody = {
  type: "object",
  properties: {
    note: { type: "string" },
  },
};

const markSentBody = {
  type: "object",
  properties: {},
};

const acceptQuotationBody = {
  type: "object",
  properties: {},
};

const rejectQuotationBody = {
  type: "object",
  properties: {
    note: { type: "string" },
  },
};

module.exports = {
  idParam,
  orderIdParam,
  invoiceConfigBody,
  registerPaymentBody,
  clearChequePaymentBody,
  sendInvoiceBody,
  sendReminderBody,
  cancelQuotationBody,
  markSentBody,
  acceptQuotationBody,
  rejectQuotationBody,
};
