// online-sales/schemas/onlineReturn.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

// ── POST /api/online-sales/returns ───────────────────────────────────────────
const createReturnBody = {
  type: "object",
  required: ["orderId", "orderNo", "customer", "productSummary", "amount", "reason"],
  additionalProperties: false,
  properties: {
    orderId: { type: "string", minLength: 24, maxLength: 24 },
    orderNo: { type: "string", minLength: 1,  maxLength: 50 },
    customer: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name:  { type: "string", minLength: 1, maxLength: 200 },
        email: { type: "string", maxLength: 200, default: "" },
      },
    },
    productSummary: { type: "string", minLength: 1, maxLength: 500 },
    amount:         { type: "number", minimum: 0 },
    reason: {
      type: "string",
      enum: ["Defective", "Wrong item", "Not as described", "Changed mind", "Other"],
    },
    adminNotes: { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PUT /api/online-sales/returns/:id ────────────────────────────────────────
const updateReturnBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    productSummary: { type: "string", maxLength: 500 },
    amount:         { type: "number", minimum: 0 },
    reason: {
      type: "string",
      enum: ["Defective", "Wrong item", "Not as described", "Changed mind", "Other"],
    },
    adminNotes: { type: "string", maxLength: 1000 },
  },
};

// ── PATCH /api/online-sales/returns/:id/status ───────────────────────────────
const updateReturnStatusBody = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["pending", "approved", "rejected", "refunded"],
    },
    adminNotes: { type: "string", maxLength: 1000, default: "" },
  },
};

// ── GET query params ──────────────────────────────────────────────────────────
const listReturnsQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", default: "" },
    status: {
      type: "string",
      enum: ["all", "pending", "approved", "rejected", "refunded"],
      default: "all",
    },
    page:  { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 2000, default: 50 },
  },
};

module.exports = {
  idParam,
  createReturnBody,
  updateReturnBody,
  updateReturnStatusBody,
  listReturnsQuery,
};
