const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/supplementary-category.controller");

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 24, maxLength: 24 } },
};

const createBody = {
  type: "object",
  required: ["name", "label"],
  properties: {
    name: { type: "string", minLength: 2 },
    label: { type: "string", minLength: 2 },
    description: { type: "string" },
    color: { type: "string" },
  },
};

const updateBody = {
  type: "object",
  properties: {
    label: { type: "string", minLength: 2 },
    description: { type: "string" },
    color: { type: "string" },
    isActive: { type: "boolean" },
  },
};

async function supplementaryCategoryRoutes(fastify) {
  const readAccess = [protect, requireRole("ADMIN", "STOCK_MANAGER", "PURCHASE_MANAGER", "COMMERCIAL_MANAGER")];
  const writeAccess = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: readAccess }, controller.getAll);
  fastify.get("/active", { preHandler: readAccess }, controller.getActive);

  fastify.post("/", { preHandler: writeAccess, schema: { body: createBody } }, controller.create);

  fastify.patch(
    "/:id",
    { preHandler: writeAccess, schema: { params: idParam, body: updateBody } },
    controller.update
  );

  fastify.delete(
    "/:id",
    { preHandler: writeAccess, schema: { params: idParam } },
    controller.delete
  );
}

module.exports = supplementaryCategoryRoutes;
