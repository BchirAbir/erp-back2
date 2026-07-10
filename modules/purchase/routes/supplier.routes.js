const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/supplier.controller");
const {
  idParam,
  createSupplierBody,
  updateSupplierBody,
  toggleBlockBody,
} = require("../schemas/supplier.schema");

async function supplierRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getAllSuppliers);
  fastify.get("/:id", { preHandler: access, schema: { params: idParam } }, controller.getSupplierById);
  fastify.post("/", { preHandler: access, schema: { body: createSupplierBody } }, controller.createSupplier);
  fastify.put(
    "/:id",
    { preHandler: access, schema: { params: idParam, body: updateSupplierBody } },
    controller.updateSupplier
  );
  fastify.post(
    "/:id/toggle-block",
    { preHandler: access, schema: { params: idParam, body: toggleBlockBody } },
    controller.toggleSupplierBlock
  );
}

module.exports = supplierRoutes;
