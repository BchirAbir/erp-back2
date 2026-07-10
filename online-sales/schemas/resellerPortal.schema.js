// online-sales/schemas/resellerPortal.schema.js

// ── POST /api/online-sales/portal/login ──────────────────────────────────────
const loginBody = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email:    { type: "string", minLength: 3,  maxLength: 200 },
    password: { type: "string", minLength: 1,  maxLength: 128 },
  },
};

// ── POST /api/online-sales/portal/request ────────────────────────────────────
const submitRequestBody = {
  type: "object",
  required: ["lines"],
  additionalProperties: false,
  properties: {
    lines: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["productId", "quantity"],
        additionalProperties: false,
        properties: {
          productId: { type: "string", minLength: 24, maxLength: 24 },
          quantity:  { type: "integer", minimum: 1 },
        },
      },
    },
    notes: { type: "string", maxLength: 1000, default: "" },
  },
};

module.exports = {
  loginBody,
  submitRequestBody,
};
