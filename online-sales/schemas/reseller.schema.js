// online-sales/schemas/reseller.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const requestIdParam = {
  type: "object",
  required: ["requestId"],
  properties: {
    requestId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

// ── POST /api/online-sales/resellers ─────────────────────────────────────────
// Email and password are auto-generated — not accepted from body
const createResellerBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name:         { type: "string", minLength: 2, maxLength: 200 },
    phone:        { type: "string", maxLength: 30,  default: "" },
    company:      { type: "string", maxLength: 200, default: "" },
    address:      { type: "string", maxLength: 500, default: "" },
    country:      { type: "string", maxLength: 100, default: "" },
    taxId:        { type: "string", maxLength: 100, default: "" },
    discountPct:  { type: "number", minimum: 0, maximum: 100, default: 0 },
    creditLimit:  { type: "number", minimum: 0, default: 0 },
    paymentTerms: {
      type: "string",
      enum: ["cash", "30j", "60j", "90j"],
      default: "cash",
    },
    notes:        { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PATCH /api/online-sales/resellers/:id ────────────────────────────────────
const updateResellerBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:         { type: "string", minLength: 2, maxLength: 200 },
    phone:        { type: "string", maxLength: 30 },
    company:      { type: "string", maxLength: 200 },
    address:      { type: "string", maxLength: 500 },
    country:      { type: "string", maxLength: 100 },
    taxId:        { type: "string", maxLength: 100 },
    discountPct:  { type: "number", minimum: 0, maximum: 100 },
    creditLimit:  { type: "number", minimum: 0 },
    paymentTerms: {
      type: "string",
      enum: ["cash", "30j", "60j", "90j"],
    },
    notes:        { type: "string", maxLength: 1000 },
  },
};

// ── PATCH /api/online-sales/resellers/:id/status ─────────────────────────────
const updateResellerStatusBody = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["pending", "active", "suspended"],
    },
  },
};

// ── PATCH /api/online-sales/resellers/:id/reset-password ─────────────────────
const resetPasswordBody = {
  type: "object",
  required: ["newPassword"],
  additionalProperties: false,
  properties: {
    newPassword: { type: "string", minLength: 6, maxLength: 128 },
  },
};

// ── POST /api/online-sales/resellers/:id/requests ────────────────────────────
const createRequestBody = {
  type: "object",
  required: ["lines"],
  additionalProperties: false,
  properties: {
    lines: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["productId", "quantity"],
        additionalProperties: false,
        properties: {
          productId: { type: "string", minLength: 24, maxLength: 24 },
          quantity:  { type: "integer", minimum: 1 },
        },
      },
    },
    notes: { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PATCH /api/online-sales/resellers/requests/:requestId/status ─────────────
const updateRequestStatusBody = {
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

// ── GET query params ──────────────────────────────────────────────────────────
const listResellersQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", default: "" },
    status: {
      type: "string",
      enum: ["all", "pending", "active", "suspended"],
      default: "all",
    },
  },
};

const listRequestsQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search:     { type: "string", default: "" },
    status:     {
      type: "string",
      enum: ["all", "pending", "approved", "rejected", "fulfilled"],
      default: "all",
    },
    resellerId: { type: "string", maxLength: 24 },
  },
};

module.exports = {
  idParam,
  requestIdParam,
  createResellerBody,
  updateResellerBody,
  updateResellerStatusBody,
  resetPasswordBody,
  createRequestBody,
  updateRequestStatusBody,
  listResellersQuery,
  listRequestsQuery,
};
