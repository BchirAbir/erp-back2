const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const rmaLine = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", minimum: 1 },
    reason: { type: "string" },
  },
};

const createRmaBody = {
  type: "object",
  required: ["salesOrderId", "lines"],
  properties: {
    salesOrderId: { type: "string", minLength: 24, maxLength: 24 },
    notes: { type: "string" },
    lines: {
      type: "array",
      minItems: 1,
      items: rmaLine,
    },
  },
};

const processRmaBody = {
  type: "object",
  required: ["resolution"],
  properties: {
    resolution: { type: "string", enum: ["RESTOCK", "DESTROY"] },
    notes: { type: "string" },
  },
};

module.exports = {
  idParam,
  createRmaBody,
  processRmaBody,
};
