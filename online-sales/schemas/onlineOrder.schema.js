// online-sales/schemas/onlineOrder.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const codeParam = {
  type: "object",
  required: ["code"],
  properties: {
    code: { type: "string", minLength: 1, maxLength: 50 },
  },
};

// ── Order line (used inside create body) ──────────────────────────────────────
const orderLineSchema = {
  type: "object",
  required: ["productId", "quantity"],
  additionalProperties: false,
  properties: {
    productId:  { type: "string", minLength: 24, maxLength: 24 },
    quantity:   { type: "integer", minimum: 1 },
    unitPrice:  { type: "number",  minimum: 0 },
  },
};

// ── POST /api/online-sales/orders ─────────────────────────────────────────────
const createOrderBody = {
  type: "object",
  required: ["customer", "lines"],
  additionalProperties: false,
  properties: {
    customer: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name:    { type: "string", minLength: 1, maxLength: 200 },
        email:   { type: "string", maxLength: 200, default: "" },
        phone:   { type: "string", maxLength: 30,  default: "" },
        address: { type: "string", maxLength: 500,  default: "" },
      },
    },
    lines: {
      type: "array",
      minItems: 1,
      items: orderLineSchema,
    },
    promotionCode: { type: "string", maxLength: 50, default: "" },
    campaignId:    { type: "string", minLength: 24, maxLength: 24, nullable: true },
    notes:         { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PUT /api/online-sales/orders/:id ─────────────────────────────────────────
const updateOrderBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    notes:          { type: "string", maxLength: 1000 },
    trackingNumber: { type: "string", maxLength: 100 },
    carrierName:    { type: "string", maxLength: 100 },
  },
};

// ── PATCH /api/online-sales/orders/:id/status ─────────────────────────────────
const updateOrderStatusBody = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["pending", "processing", "completed", "cancelled"],
    },
  },
};

// ── GET query params ──────────────────────────────────────────────────────────
const listOrdersQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", default: "" },
    status: {
      type: "string",
      enum: ["all", "pending", "processing", "completed", "cancelled"],
      default: "all",
    },
    page:  { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 2000, default: 50 },
  },
};

module.exports = {
  idParam,
  codeParam,
  createOrderBody,
  updateOrderBody,
  updateOrderStatusBody,
  listOrdersQuery,
};
