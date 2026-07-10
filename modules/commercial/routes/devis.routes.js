const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/devis.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const orderIdParam = {
  type: "object",
  required: ["orderId"],
  properties: { orderId: { type: "string", minLength: 24, maxLength: 24 } },
};

async function devisRoutes(fastify) {
  const readAccess = [protect, requireRole("ADMIN", "COMMERCIAL_MANAGER", "FINANCE_MANAGER")];
  const financeWrite = [protect, requireRole("ADMIN", "FINANCE_MANAGER")];

  fastify.get("/", { preHandler: readAccess }, controller.getAllDevis);
  fastify.get(
    "/:id",
    { preHandler: readAccess, schema: { params: idParam } },
    controller.getDevisById
  );
  fastify.get(
    "/by-order/:orderId",
    { preHandler: readAccess, schema: { params: orderIdParam } },
    controller.getDevisByOrderId
  );
  fastify.post(
    "/:id/accept",
    { preHandler: financeWrite, schema: { params: idParam } },
    controller.acceptDevis
  );
  fastify.delete(
    "/:id",
    { preHandler: financeWrite, schema: { params: idParam } },
    controller.deleteDevis
  );
  fastify.post(
    "/:id/create-invoice",
    { preHandler: financeWrite, schema: { params: idParam } },
    controller.createInvoiceFromDevis
  );
}

module.exports = devisRoutes;
