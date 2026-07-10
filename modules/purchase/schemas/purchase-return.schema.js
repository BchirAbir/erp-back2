const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createReturnBody = {
  type: "object",
  required: ["receiptId", "reason"],
  properties: {
    receiptId: { type: "string", minLength: 24, maxLength: 24 },
    reason: { type: "string", minLength: 3 },
    notes: { type: "string" },
  },
};

const updateReturnStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["VALIDATED", "SENT", "CLOSED"],
    },
  },
};

module.exports = { idParam, createReturnBody, updateReturnStatusBody };
