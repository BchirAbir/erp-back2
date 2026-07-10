const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const PRODUCT_TYPE_ENUM = ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"];

const nullableProductType = {
  anyOf: [
    { type: "string", enum: PRODUCT_TYPE_ENUM },
    { type: "null" },
  ],
};

const createSkuSettingBody = {
  type: "object",
  required: ["skuName", "skuMax"],
  properties: {
    skuName:     { type: "string", minLength: 2 },
    skuMax:      { type: "number", minimum: 1 },
    productType: nullableProductType,
  },
};

const updateSkuSettingBody = {
  type: "object",
  properties: {
    skuName:     { type: "string", minLength: 2 },
    skuMax:      { type: "number", minimum: 1 },
    productType: nullableProductType,
  },
};

const patchCounterBody = {
  type: "object",
  required: ["counter"],
  properties: {
    counter: { type: "number", minimum: 0 },
  },
};

module.exports = {
  idParam,
  createSkuSettingBody,
  updateSkuSettingBody,
  patchCounterBody,
};