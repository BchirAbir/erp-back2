const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createPurchaseRequestBody = {
  type: "object",
  required: ["requestNo", "productId", "requestedQuantity", "reason", "department"],
  properties: {
    requestNo: { type: "string", minLength: 2 },
    productId: { type: "string", minLength: 24, maxLength: 24 },
    requestedQuantity: { type: "number", minimum: 1 },
    department: { type: "string", minLength: 2 },
    availableBudget: { type: "number", minimum: 0 },
    reason: { type: "string", minLength: 2 },
    priority: {
      type: "string",
      enum: ["LOW", "NORMAL", "URGENT"],
    },
    status: {
      type: "string",
      enum: ["DRAFT", "SUBMITTED"],
    },
    sourceAlertId: { type: "string", minLength: 24, maxLength: 24 },
    notes: { type: "string" },
  },
};

const updatePurchaseRequestStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["SUBMITTED", "APPROVED", "REJECTED"],
    },
    notes: { type: "string" },
  },
};

module.exports = {
  idParam,
  createPurchaseRequestBody,
  updatePurchaseRequestStatusBody,
};
