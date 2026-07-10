const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-request.controller");
const {
  idParam,
  createPurchaseRequestBody,
  updatePurchaseRequestStatusBody,
} = require("../schemas/purchase-request.schema");

const createFromAlertBody = {
  type: "object",
  required: ["requestNo", "requestedQuantity"],
  properties: {
    requestNo: { type: "string", minLength: 2 },
    requestedQuantity: { type: "number", minimum: 1 },
    reason: { type: "string" },
    priority: {
      type: "string",
      enum: ["LOW", "NORMAL", "URGENT"],
    },
    notes: { type: "string" },
  },
};

async function purchaseRequestRoutes(fastify) {
  const purchaseAccess = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];
  const stockToPurchaseAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER")];

  fastify.get("/", { preHandler: purchaseAccess }, controller.getAllPurchaseRequests);

  fastify.get(
    "/:id",
    { preHandler: purchaseAccess, schema: { params: idParam } },
    controller.getPurchaseRequestById
  );

  fastify.post(
    "/",
    { preHandler: purchaseAccess, schema: { body: createPurchaseRequestBody } },
    controller.createPurchaseRequest
  );

  fastify.post(
    "/from-alert/:id",
    {
      preHandler: stockToPurchaseAccess,
      schema: { params: idParam, body: createFromAlertBody },
    },
    controller.createPurchaseRequestFromAlert
  );

  fastify.patch(
    "/:id/status",
    {
      preHandler: purchaseAccess,
      schema: { params: idParam, body: updatePurchaseRequestStatusBody },
    },
    controller.updatePurchaseRequestStatus
  );
}

module.exports = purchaseRequestRoutes;