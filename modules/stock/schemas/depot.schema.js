const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createDepotBody = {
  type: "object",
  required: ["name", "address", "managerId", "productTypeScope"],
  properties: {
    name: { type: "string", minLength: 2 },
    address: { type: "string", minLength: 3 },
    managerId: { type: "string", minLength: 24, maxLength: 24 },
    productTypeScope: {
      type: "string",
      enum: ["MP", "PF", "MP_PF"],
    },
    capacityKg: { type: "number", minimum: 0 },
    capacityPackets: { type: "number", minimum: 0 },
    status: {
      type: "string",
      enum: ["ACTIVE", "INACTIVE"],
    },
  },
};

const updateDepotBody = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 2 },
    address: { type: "string", minLength: 3 },
    managerId: { type: "string", minLength: 24, maxLength: 24 },
    productTypeScope: {
      type: "string",
      enum: ["MP", "PF", "MP_PF"],
    },
    capacityKg: { type: "number", minimum: 0 },
    capacityPackets: { type: "number", minimum: 0 },
    status: {
      type: "string",
      enum: ["ACTIVE", "INACTIVE"],
    },
  },
};

module.exports = {
  idParam,
  createDepotBody,
  updateDepotBody,
};