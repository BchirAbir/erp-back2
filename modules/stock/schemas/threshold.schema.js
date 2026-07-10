const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const productIdParam = {
  type: "object",
  required: ["productId"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createThresholdRuleBody = {
  type: "object",
  required: ["productId", "minQuantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    minQuantity: { type: "number", minimum: 0 },
    alertEnabled: { type: "boolean", default: true },
    isActive: { type: "boolean", default: true },
    notifyRoles: {
      type: "array",
      items: { type: "string" },
      default: ["ADMIN"],
    },
  },
};

const updateThresholdRuleBody = {
  type: "object",
  properties: {
    minQuantity: { type: "number", minimum: 0 },
    alertEnabled: { type: "boolean" },
    isActive: { type: "boolean" },
    notifyRoles: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const updateAlertStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["OPEN", "ACKNOWLEDGED", "CLOSED"],
    },
  },
};

module.exports = {
  idParam,
  productIdParam,
  createThresholdRuleBody,
  updateThresholdRuleBody,
  updateAlertStatusBody,
};