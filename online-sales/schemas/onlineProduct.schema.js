// online-sales/schemas/onlineProduct.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createProductBody = {
  type: "object",
  required: ["stockProductId", "name", "sku", "onlinePrice"],
  additionalProperties: false,
  properties: {
    stockProductId:     { type: "string", minLength: 24, maxLength: 24 },
    name:               { type: "string", minLength: 1,  maxLength: 200 },
    sku:                { type: "string", minLength: 1,  maxLength: 100 },
    category:           { type: "string", maxLength: 100, default: "" },
    description:        { type: "string", maxLength: 2000, default: "" },
    onlinePrice:        { type: "number", minimum: 0 },
    minStockThreshold:  { type: "integer", minimum: 0, default: 0 },
    onlineAllocatedQty: { type: "integer", minimum: 0, default: 0 },
    isVisible:          { type: "boolean", default: true },
    tags:               { type: "array", items: { type: "string", maxLength: 50 }, default: [] },
  },
};

const updateProductBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:               { type: "string", minLength: 1, maxLength: 200 },
    sku:                { type: "string", minLength: 1, maxLength: 100 },
    category:           { type: "string", maxLength: 100 },
    description:        { type: "string", maxLength: 2000 },
    onlinePrice:        { type: "number", minimum: 0 },
    minStockThreshold:  { type: "integer", minimum: 0 },
    onlineAllocatedQty: { type: "integer", minimum: 0 },
    isVisible:          { type: "boolean" },
    tags:               { type: "array", items: { type: "string", maxLength: 50 } },
  },
};

// PATCH /api/online-sales/products/:id/allocation
const updateAllocationBody = {
  type: "object",
  required: ["onlineAllocatedQty"],
  additionalProperties: false,
  properties: {
    onlineAllocatedQty: { type: "integer", minimum: 0 },
  },
};

const listProductsQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", default: "" },
    status: {
      type: "string",
      enum: ["all", "in-stock", "low-stock", "out-of-stock", "pending"],
      default: "all",
    },
  },
};

module.exports = {
  idParam,
  createProductBody,
  updateProductBody,
  updateAllocationBody,
  listProductsQuery,
};