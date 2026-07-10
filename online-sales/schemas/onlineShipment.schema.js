// online-sales/schemas/onlineShipment.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

// ── POST /api/online-sales/shipments ─────────────────────────────────────────
const createShipmentBody = {
  type: "object",
  required: ["orderId", "orderNo", "customer", "carrier"],
  additionalProperties: false,
  properties: {
    orderId:  { type: "string", minLength: 24, maxLength: 24 },
    orderNo:  { type: "string", minLength: 1,  maxLength: 50 },
    customer: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name:  { type: "string", minLength: 1, maxLength: 200 },
        email: { type: "string", maxLength: 200, default: "" },
        phone: { type: "string", maxLength: 30,  default: "" },
      },
    },
    productSummary: { type: "string", maxLength: 500,  default: "" },
    carrier: {
      type: "string",
      enum: ["DHL", "Aramex", "TNT", "Other"],
    },
    trackingNumber: { type: "string", maxLength: 100, default: "" },
    estimatedAt:    { type: "string", nullable: true },
    notes:          { type: "string", maxLength: 1000, default: "" },
  },
};

// ── PUT /api/online-sales/shipments/:id ──────────────────────────────────────
const updateShipmentBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    carrier: {
      type: "string",
      enum: ["DHL", "Aramex", "TNT", "Other"],
    },
    trackingNumber: { type: "string", maxLength: 100 },
    estimatedAt:    { type: "string", nullable: true },
    notes:          { type: "string", maxLength: 1000 },
  },
};

// ── PATCH /api/online-sales/shipments/:id/status ─────────────────────────────
const updateShipmentStatusBody = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["pending", "in-transit", "delivered", "failed"],
    },
  },
};

// ── GET query params ──────────────────────────────────────────────────────────
const listShipmentsQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", default: "" },
    status: {
      type: "string",
      enum: ["all", "pending", "in-transit", "delivered", "failed"],
      default: "all",
    },
    page:  { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
  },
};

module.exports = {
  idParam,
  createShipmentBody,
  updateShipmentBody,
  updateShipmentStatusBody,
  listShipmentsQuery,
};
