const { protect, requireRole } = require("../../../hooks/auth.hook");
const thresholdController = require("../controllers/threshold.controller");
const {
  idParam,
  productIdParam,
  createThresholdRuleBody,
  updateThresholdRuleBody,
} = require("../schemas/threshold.schema");

async function thresholdRoutes(fastify) {
  const stockAccess = [protect];
  const adminAndStockManager = [protect, requireRole("ADMIN", "STOCK_MANAGER")];

  fastify.get(
    "/",
    { preHandler: stockAccess, schema: { tags: ["Threshold Rules"] } },
    thresholdController.getAllRules
  );

  fastify.get(
    "/:id",
    { preHandler: stockAccess, schema: { params: idParam, tags: ["Threshold Rules"] } },
    thresholdController.getRuleById
  );

  fastify.get(
    "/product/:productId",
    { preHandler: stockAccess, schema: { params: productIdParam, tags: ["Threshold Rules"] } },
    thresholdController.getRuleByProductId
  );

  fastify.post(
    "/",
    { preHandler: adminAndStockManager, schema: { body: createThresholdRuleBody, tags: ["Threshold Rules"] } },
    thresholdController.createRule
  );

  fastify.put(
    "/:id",
    {
      preHandler: adminAndStockManager,
      schema: { params: idParam, body: updateThresholdRuleBody, tags: ["Threshold Rules"] }
    },
    thresholdController.updateRule
  );

  fastify.delete(
    "/:id",
    { preHandler: adminAndStockManager, schema: { params: idParam, tags: ["Threshold Rules"] } },
    thresholdController.deleteRule
  );
}

module.exports = thresholdRoutes;

