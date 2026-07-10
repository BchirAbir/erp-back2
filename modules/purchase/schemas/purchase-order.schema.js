const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const lineSchema = {
  type: "object",
  required: ["productId", "quantity", "unitPrice"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    description: { type: "string" },
    quantity: { type: "number", minimum: 1 },
    unitPrice: { type: "number", minimum: 0 },
    discountRate: { type: "number", minimum: 0, maximum: 100 },
    vatRate: { type: "number", minimum: 0, maximum: 100 },
  },
};

const createPurchaseOrderBody = {
  type: "object",
  required: ["supplierId"],
  properties: {
    purchaseRequestId: { type: "string", minLength: 24, maxLength: 24 },
    tenderId: { type: "string", minLength: 24, maxLength: 24 },
    supplierId: { type: "string", minLength: 24, maxLength: 24 },
    lines: { type: "array", items: lineSchema },
    deliveryTerms: { type: "string" },
    paymentTerms: { type: "string" },
  },
};

const updatePurchaseOrderStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["VALIDATED", "SENT", "CLOSED"],
    },
  },
};

module.exports = {
  idParam,
  createPurchaseOrderBody,
  updatePurchaseOrderStatusBody,
};
