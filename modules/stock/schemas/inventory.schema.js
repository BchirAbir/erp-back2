const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const lineIdParam = {
  type: "object",
  required: ["id", "lineId"],
  properties: {
    id:     { type: "string", minLength: 24, maxLength: 24 },
    lineId: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createInventoryBody = {
  type: "object",
  required: ["type"],
  properties: {
    type:      { type: "string", enum: ["PERIODIC", "PERMANENT"] },
    notes:     { type: "string", default: "" },
    depotId:   { type: "string", minLength: 24, maxLength: 24 },
    dateDebut: { type: "string", nullable: true },
    dateFin:   { type: "string", nullable: true },
    year:      { type: "number", nullable: true },
  },
};

// Stock manager adds a line — just product, system qty is auto-loaded
const addLineBody = {
  type: "object",
  required: ["productId"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    lotRef:    { type: "string", default: "" },
    notes:     { type: "string", default: "" },
  },
};

// Depot manager submits all physical counted quantities at once
const submitDepotCountBody = {
  type: "object",
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["lineId", "countedQuantity"],
        properties: {
          lineId:          { type: "string", minLength: 24, maxLength: 24 },
          countedQuantity: { type: "number", minimum: 0 },
        },
      },
    },
  },
};

// Stock manager rejects the session with a reason
const rejectInventoryBody = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: { type: "string", minLength: 2 },
  },
};

// Depot manager submits a text response after stock manager rejection
const submitDepotResponseBody = {
  type: "object",
  required: ["response"],
  properties: {
    response: { type: "string", minLength: 2 },
  },
};

module.exports = {
  idParam,
  lineIdParam,
  createInventoryBody,
  addLineBody,
  submitDepotCountBody,
  rejectInventoryBody,
  submitDepotResponseBody,
};
