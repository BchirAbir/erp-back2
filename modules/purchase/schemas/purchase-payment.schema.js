const createPurchasePaymentBody = {
  type: "object",
  required: ["supplierId", "purchaseInvoiceId", "method", "amount", "paymentDate"],
  properties: {
    supplierId: { type: "string", minLength: 24, maxLength: 24 },
    purchaseInvoiceId: { type: "string", minLength: 24, maxLength: 24 },
    method: {
      type: "string",
      enum: ["BANK_TRANSFER", "CHECK", "CASH"],
    },
    amount: { type: "number", minimum: 0 },
    paymentDate: { type: "string", format: "date-time" },
    notes: { type: "string" },
  },
};

module.exports = {
  createPurchasePaymentBody,
};
