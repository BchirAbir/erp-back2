const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createPurchaseInvoiceBody = {
  type: "object",
  required: [
    "supplierInvoiceRef",
    "supplierId",
    "purchaseOrderId",
    "invoiceDate",
    "dueDate",
  ],
  properties: {
    supplierInvoiceRef: { type: "string", minLength: 1 },
    supplierId: { type: "string", minLength: 24, maxLength: 24 },
    purchaseOrderId: { type: "string", minLength: 24, maxLength: 24 },
    receiptIds: {
      type: "array",
      items: { type: "string", minLength: 24, maxLength: 24 },
    },
    invoiceDate: { type: "string", format: "date-time" },
    dueDate: { type: "string", format: "date-time" },
    applyTva: { type: "boolean" },
    applyFodec: { type: "boolean" },
    notes: { type: "string" },
  },
};

const updatePurchaseInvoiceStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["APPROVED", "REJECTED", "PARTIALLY_PAID", "PAID"],
    },
    amountPaid: { type: "number", minimum: 0 },
    rejectionReason: { type: "string" },
  },
};

module.exports = {
  idParam,
  createPurchaseInvoiceBody,
  updatePurchaseInvoiceStatusBody,
};
