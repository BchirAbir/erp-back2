const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const receiptLineSchema = {
  type: "object",
  required: ["purchaseOrderLineId", "receivedQuantity", "acceptedQuantity"],
  properties: {
    purchaseOrderLineId: { type: "string", minLength: 1 },
    receivedQuantity: { type: "number", minimum: 0 },
    acceptedQuantity: { type: "number", minimum: 0 },
    qualityStatus: {
      type: "string",
      enum: ["ACCEPTED", "WITH_RESERVATION", "REJECTED"],
    },
    discrepancyNotes: { type: "string" },
    lotRef: { type: "string" },
  },
};

const createReceiptBody = {
  type: "object",
  required: ["purchaseOrderId", "depotId", "lines"],
  properties: {
    purchaseOrderId: { type: "string", minLength: 24, maxLength: 24 },
    depotId: { type: "string", minLength: 24, maxLength: 24 },
    lines: { type: "array", minItems: 1, items: receiptLineSchema },
    supplierRating: { type: "number", minimum: 1, maximum: 5 },
    notes: { type: "string" },
  },
};

module.exports = {
  idParam,
  createReceiptBody,
};
