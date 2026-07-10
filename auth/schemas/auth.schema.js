// schemas/auth.schema.js

const registerBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "password"],
  properties: {
    name:       { type: "string", minLength: 2 },
    email:      { type: "string", format: "email" },
    password:   { type: "string", minLength: 6 },
    role:       { type: "string", enum: ["ADMIN", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "EMPLOYEE"] },
    department: { type: "string", enum: ["HR", "Marketing", "Online Sales", "None"] },
  },
};

const loginBody = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email:    { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
};

module.exports = { registerBody, loginBody };