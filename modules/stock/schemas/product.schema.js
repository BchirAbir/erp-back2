const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createProductBody = {
  type: "object",
  required: ["sku", "name", "type", "unit"],
  properties: {
    sku: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 2 },
    type: {
      type: "string",
      enum: ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"],
    },
    unit: {
      type: "string",
      enum: ["pcs", "kg", "l", "m"],
    },
    isLotTracked: { type: "boolean" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
    purchasePrice: { type: "number", minimum: 0 },
    category: { type: "string" },
  },
};

const updateProductBody = {
  type: "object",
  properties: {
    sku: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 2 },
    type: {
      type: "string",
      enum: ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"],
    },
    unit: {
      type: "string",
      enum: ["pcs", "kg", "l", "m"],
    },
    isLotTracked: { type: "boolean" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
    purchasePrice: { type: "number", minimum: 0 },
    category: { type: "string" },
  },
};

module.exports = {
  idParam,
  createProductBody,
  updateProductBody,
};