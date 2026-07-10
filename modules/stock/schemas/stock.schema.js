const objectIdParam = {
  type: "object",
  required: ["productId"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const movementBaseBody = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", minimum: 1 },

    lotRef: { type: "string", default: "" },
    lotMode: { type: "string", enum: ["FIFO", "LIFO", "MANUAL"] },

    sourceModule: {
      type: "string",
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PRODUCTION", "FINANCE"],
      default: "STOCK",
    },
    sourceType: { type: "string", default: "" },
    sourceId: { type: "string", default: "" },
    reference: { type: "string", default: "" },
    reason: { type: "string", default: "" },
    notes: { type: "string", default: "" },
  },
};

const entryBody = { ...movementBaseBody };

const exitBody = { ...movementBaseBody };

const reservationBody = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", exclusiveMinimum: 0 },

    sourceModule: {
      type: "string",
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PRODUCTION", "FINANCE"],
      default: "COMMERCIAL",
    },
    sourceType: { type: "string", default: "SALES_ORDER_CONFIRMED" },
    sourceId: { type: "string", default: "" },
    reference: { type: "string", default: "" },
    reason: { type: "string", default: "Stock reserved" },
    notes: { type: "string", default: "" },
  },
};

const releaseReservationBody = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", exclusiveMinimum: 0 },

    sourceModule: {
      type: "string",
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PRODUCTION", "FINANCE"],
      default: "COMMERCIAL",
    },
    sourceType: { type: "string", default: "SALES_ORDER_RELEASED" },
    sourceId: { type: "string", default: "" },
    reference: { type: "string", default: "" },
    reason: { type: "string", default: "Reserved stock released" },
    notes: { type: "string", default: "" },
  },
};

const deductReservationBody = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", exclusiveMinimum: 0 },

    lotRef: { type: "string", default: "" },
    lotMode: { type: "string", enum: ["FIFO", "LIFO", "MANUAL"] },

    sourceModule: {
      type: "string",
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PRODUCTION", "FINANCE"],
      default: "COMMERCIAL",
    },
    sourceType: { type: "string", default: "SALES_ORDER_SHIPPED" },
    sourceId: { type: "string", default: "" },
    reference: { type: "string", default: "" },
    reason: { type: "string", default: "Reserved stock deducted" },
    notes: { type: "string", default: "" },
  },
};

module.exports = {
  objectIdParam,
  entryBody,
  exitBody,
  reservationBody,
  releaseReservationBody,
  deductReservationBody,
};