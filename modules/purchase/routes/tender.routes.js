const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/tender.controller");
const {
  idParam,
  createTenderBody,
  addOfferBody,
  selectOfferBody,
} = require("../schemas/tender.schema");

async function tenderRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAllTenders);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, controller.getTenderById);
  fastify.post("/", { preHandler: access, schema: { body: createTenderBody } }, controller.createTender);
  fastify.patch(
    "/:id/suppliers",
    {
      preHandler: access,
      schema: {
        params: idParam,
        body: {
          type: "object",
          properties: {
            supplierIds: { type: "array", items: { type: "string", minLength: 24, maxLength: 24 } },
          },
        },
      },
    },
    controller.updateSuppliers
  );
  fastify.post("/:id/send", { preHandler: access, schema: { params: idParam } }, controller.sendTender);
  fastify.post("/:id/create-order", { preHandler: access, schema: { params: idParam } }, controller.createMissingPurchaseOrder);
  fastify.post(
    "/:id/offers",
    { preHandler: access, schema: { params: idParam, body: addOfferBody } },
    controller.addOffer
  );
  fastify.post(
    "/:id/select-offer",
    { preHandler: access, schema: { params: idParam, body: selectOfferBody } },
    controller.selectOffer
  );
}

module.exports = tenderRoutes;
