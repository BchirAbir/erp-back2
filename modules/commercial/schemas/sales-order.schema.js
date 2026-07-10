const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const salesOrderLine = {
  type: "object",
  required: ["productId", "quantity"],
  properties: {
    productId: { type: "string", minLength: 24, maxLength: 24 },
    quantity: { type: "number", minimum: 1 },
    unitPrice: { type: "number", minimum: 0 },
    discount: { type: "number", minimum: 0, maximum: 100 },
  },
};

const allocationEntry = {
  type: "object",
  required: ["depotId", "allocatedQuantity"],
  properties: {
    depotId: { type: "string", minLength: 24, maxLength: 24 },
    allocatedQuantity: { type: "number", minimum: 0 },
  },
};

const ordonanceLine = {
  type: "object",
  required: ["lineIndex", "productId", "allocations"],
  properties: {
    lineIndex: { type: "number", minimum: 0 },
    productId: { type: "string", minLength: 24, maxLength: 24 },
    allocations: {
      type: "array",
      items: allocationEntry,
    },
  },
};

const createSalesOrderBody = {
  type: "object",
  required: ["lines"],
  properties: {
    orderNo: { type: "string", minLength: 1 },
    customerId: { type: "string", minLength: 24, maxLength: 24 },
    customerName: { type: "string" },
    notes: { type: "string" },
    promisedDate: { type: "string" },
    lines: {
      type: "array",
      minItems: 1,
      items: salesOrderLine,
    },
  },
};

const shipOrderBody = {
  type: "object",
  properties: {
    trackingNumber: { type: "string" },
    carrierId: { type: "string", minLength: 24, maxLength: 24 },
    vehicleId: { type: "string", minLength: 24, maxLength: 24 },
    shippingCost: { type: "number", minimum: 0 },
    shipmentAddress: { type: "string" },
  },
};

const markUrgentBody = {
  type: "object",
  properties: {
    urgent: { type: "boolean" },
  },
};

const rejectShipBody = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: { type: "string", minLength: 1 },
  },
};

const ordonanceOrderBody = {
  type: "object",
  required: ["plannedStartDate", "plannedEndDate", "lines"],
  properties: {
    plannedStartDate: { type: "string" },
    plannedEndDate: { type: "string" },
    lines: {
      type: "array",
      minItems: 1,
      items: ordonanceLine,
    },
  },
};

const bulkOrdonanceOrderBody = {
  type: "object",
  required: ["orders"],
  properties: {
    orders: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["orderId", "lines"],
        properties: {
          orderId: { type: "string", minLength: 24, maxLength: 24 },
          plannedStartDate: { type: "string" },
          plannedEndDate: { type: "string" },
          lines: {
            type: "array",
            minItems: 1,
            items: ordonanceLine,
          },
        },
      },
    },
  },
};

const requestProductionBody = {
  type: "object",
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      minItems: 1,
      items: ordonanceLine,
    },
  },
};

module.exports = {
  idParam,
  createSalesOrderBody,
  shipOrderBody,
  markUrgentBody,
  rejectShipBody,
  ordonanceOrderBody,
  bulkOrdonanceOrderBody,
  requestProductionBody,
};
