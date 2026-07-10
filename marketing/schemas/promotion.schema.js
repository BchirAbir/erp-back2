// schemas/promotion.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createPromotionBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "discount", "type", "startDate"],
  properties: {
    name:        { type: "string", minLength: 1 },
    discount:    { type: "number", minimum: 1, maximum: 100 },
    type:        { type: "string", enum: ["Seasonal", "Loyalty", "Referral", "VIP", "Other"] },
    status:      { type: "string", enum: ["Active", "Scheduled", "Paused", "Completed"] },
    code:        { type: "string" },
    startDate:   { type: "string", minLength: 1 },
    endDate:     { type: "string" },
    description: { type: "string" },
  },
};

const updatePromotionBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:        { type: "string", minLength: 1 },
    discount:    { type: "number", minimum: 1, maximum: 100 },
    type:        { type: "string", enum: ["Seasonal", "Loyalty", "Referral", "VIP", "Other"] },
    status:      { type: "string", enum: ["Active", "Scheduled", "Paused", "Completed"] },
    code:        { type: "string" },
    startDate:   { type: "string" },
    endDate:     { type: "string" },
    description: { type: "string" },
  },
};

module.exports = { createPromotionBody, updatePromotionBody, idParam };