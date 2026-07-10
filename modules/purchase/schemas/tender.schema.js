const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createTenderBody = {
  type: "object",
  properties: {
    purchaseRequestId: { type: "string", minLength: 24, maxLength: 24 },
    supplementaryRequestId: { type: "string", minLength: 24, maxLength: 24 },
    supplierIds: {
      type: "array",
      items: { type: "string", minLength: 24, maxLength: 24 },
    },
    notes: { type: "string" },
  },
};

const addOfferBody = {
  type: "object",
  required: ["supplierId", "amountHt", "leadTimeDays"],
  properties: {
    supplierId: { type: "string", minLength: 24, maxLength: 24 },
    amountHt: { type: "number", minimum: 0 },
    leadTimeDays: { type: "number", minimum: 0 },
    notes: { type: "string" },
  },
};

const selectOfferBody = {
  type: "object",
  required: ["offerId"],
  properties: {
    offerId: { type: "string", minLength: 1 },
  },
};

module.exports = {
  idParam,
  createTenderBody,
  addOfferBody,
  selectOfferBody,
};
