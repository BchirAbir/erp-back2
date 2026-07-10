const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const supplierBodyProperties = {
  name: { type: "string", minLength: 2 },
  contactName: { type: "string" },
  email: { type: "string" },
  phone: { type: "string" },
  address: { type: "string" },
  rib: { type: "string" },
  paymentTerms: { type: "string" },
  category: { type: "string" },
  rating: { type: "number", minimum: 0, maximum: 5 },
  notes: { type: "string" },
  blockedReason: { type: "string" },
  priceHt: { type: "number", minimum: 0 },
  leadTimeDays: { type: "number", minimum: 0 },
  productIds: {
    type: "array",
    items: { type: "string", minLength: 24, maxLength: 24 },
  },
  productPrices: {
    type: "array",
    items: {
      type: "object",
      required: ["productId"],
      properties: {
        productId: { type: "string", minLength: 24, maxLength: 24 },
        priceHt: { type: "number", minimum: 0 },
      },
    },
  },
};

const createSupplierBody = {
  type: "object",
  required: ["name"],
  properties: supplierBodyProperties,
};

const updateSupplierBody = {
  type: "object",
  properties: supplierBodyProperties,
};

const toggleBlockBody = {
  type: "object",
  properties: {
    blockedReason: { type: "string" },
  },
};

module.exports = {
  idParam,
  createSupplierBody,
  updateSupplierBody,
  toggleBlockBody,
};
