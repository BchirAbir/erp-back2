// online-sales/routes/onlineProduct.routes.js
const service = require("../services/onlineProduct.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const {
  idParam,
  createProductBody,
  updateProductBody,
  updateAllocationBody,
  listProductsQuery,
} = require("../schemas/onlineProduct.schema");

async function onlineProductRoutes(fastify) {
  const ALLOWED = requireRole("SALES_MANAGER", "ADMIN");
  const auth = { preHandler: [protect, ALLOWED] };

  // GET /api/online-sales/products?search=&status=
  fastify.get("/", { ...auth, schema: { querystring: listProductsQuery } }, async (req, reply) => {
    const { search = "", status = "all" } = req.query;
    return reply.send(await service.getAll({ search, status }));
  });

  // GET /api/online-sales/products/stats
  fastify.get("/stats", auth, async (req, reply) => {
    return reply.send(await service.getStats());
  });

  // GET /api/online-sales/products/:id
  fastify.get("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const product = await service.getById(req.params.id);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return reply.send(product);
  });

  // POST /api/online-sales/products
  fastify.post("/", { ...auth, schema: { body: createProductBody } }, async (req, reply) => {
return reply.code(201).send(await service.create(req.body, req.user._id));  });

  // PUT /api/online-sales/products/:id
  fastify.put("/:id", { ...auth, schema: { params: idParam, body: updateProductBody } }, async (req, reply) => {
    const product = await service.update(req.params.id, req.body);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return reply.send(product);
  });

  // PATCH /api/online-sales/products/:id/visibility
  fastify.patch("/:id/visibility", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const product = await service.toggleVisibility(req.params.id);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return reply.send(product);
  });

  // PATCH /api/online-sales/products/:id/allocation
  fastify.patch("/:id/allocation", { ...auth, schema: { params: idParam, body: updateAllocationBody } }, async (req, reply) => {
    try {
      return reply.send(await service.updateAllocation(req.params.id, req.body.onlineAllocatedQty));
    } catch (err) {
      return reply.code(err.statusCode || 400).send({ message: err.message });
    }
  });

  // DELETE /api/online-sales/products/:id
  fastify.delete("/:id", { ...auth, schema: { params: idParam } }, async (req, reply) => {
    const product = await service.remove(req.params.id);
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return reply.code(204).send();
  });
}

module.exports = onlineProductRoutes;