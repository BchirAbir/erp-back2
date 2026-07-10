// schemas/admin.schema.js

const createUserBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "password", "role"],
  properties: {
    name:       { type: "string", minLength: 2 },
    email:      { type: "string", format: "email" },
    password:   { type: "string", minLength: 6 },
    role:       { type: "string", enum: ["ADMIN", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "EMPLOYEE"] },
    department: { type: "string", enum: ["HR", "Marketing", "Online Sales", "None"] },
    position:   { type: "string" },
  },
};

const updateUserBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:       { type: "string", minLength: 2 },
    email:      { type: "string", format: "email" },
    role:       { type: "string", enum: ["ADMIN", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "EMPLOYEE"] },
    department: { type: "string", enum: ["HR", "Marketing", "Online Sales", "None"] },
    position:   { type: "string" },
    status:     { type: "string", enum: ["Active", "On Leave", "Inactive"] },
  },
};

const idParam = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const resetPasswordBody = {
  type: "object",
  additionalProperties: false,
  required: ["newPassword"],
  properties: {
    newPassword: { type: "string", minLength: 6 },
  },
};

module.exports = { createUserBody, updateUserBody, idParam, resetPasswordBody };