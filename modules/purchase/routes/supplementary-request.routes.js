const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/supplementary-request.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const createBody = {
  type: "object",
  required: ["title", "quantity", "department", "reason"],
  properties: {
    title: { type: "string", minLength: 2 },
    category: { type: "string" },
    quantity: { type: "number", minimum: 1 },
    unit: { type: "string" },
    estimatedCost: { type: "number", minimum: 0 },
    department: { type: "string", minLength: 1 },
    reason: { type: "string", minLength: 2 },
    priority: { type: "string", enum: ["LOW", "NORMAL", "URGENT"] },
    notes: { type: "string" },
  },
};

const updateStatusBody = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["SUBMITTED", "APPROVED", "REJECTED"] },
    notes: { type: "string" },
  },
};

async function supplementaryRequestRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER", "PURCHASE_MANAGER")];
  const adminAccess = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAll);

  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, controller.getById);

  fastify.post("/", { preHandler: access, schema: { body: createBody } }, controller.create);

  // STOCK_MANAGER can submit their own draft requests (DRAFT → SUBMITTED only)
  fastify.post(
    "/:id/submit",
    { preHandler: access, schema: { params: idParam } },
    controller.submit
  );

  // ADMIN / PURCHASE_MANAGER can approve or reject
  fastify.patch(
    "/:id/status",
    { preHandler: adminAccess, schema: { params: idParam, body: updateStatusBody } },
    controller.updateStatus
  );

  fastify.delete(
    "/:id",
    { preHandler: access, schema: { params: idParam } },
    controller.delete
  );
}

module.exports = supplementaryRequestRoutes;
