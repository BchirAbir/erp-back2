// online-sales/schemas/stockRefill.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

// ── POST /api/online-sales/refill ─────────────────────────────────────────────
const createRefillBody = {
  type: "object",
  required: ["productIds"],
  additionalProperties: false,
  properties: {
    productIds: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 24, maxLength: 24 },
    },
    quantities: {
      type: "object",
      additionalProperties: { type: "integer", minimum: 1 },
      default: {},
    },
    priority: {
      type: "string",
      enum: ["LOW", "NORMAL", "URGENT"],
      default: "NORMAL",
    },
    notes: { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PATCH /api/online-sales/refill/:id/status ─────────────────────────────────
const updateRefillStatusBody = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["pending", "approved", "rejected", "fulfilled"],
    },
    adminNotes: { type: "string", maxLength: 1000, default: "" },
  },
};

// ── GET /api/online-sales/refill?status=&page=&limit= ─────────────────────────
const listRefillQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["all", "pending", "approved", "rejected", "fulfilled"],
      default: "all",
    },
    page:  { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
  },
};

module.exports = {
  idParam,
  createRefillBody,
  updateRefillStatusBody,
  listRefillQuery,
};
