const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/sku-setting.controller");
const {
  idParam,
  createSkuSettingBody,
  updateSkuSettingBody,
  patchCounterBody,
} = require("../schemas/sku-setting.schema");

async function skuSettingRoutes(fastify) {
  const stockManagerOnly = [protect, requireRole("ADMIN", "STOCK_MANAGER")];

  fastify.get("/", { preHandler: stockManagerOnly }, controller.getAllSkuSettings);

  fastify.get(
    "/:id",
    { preHandler: stockManagerOnly, schema: { params: idParam } },
    controller.getSkuSettingById
  );

  fastify.post(
    "/",
    { preHandler: stockManagerOnly, schema: { body: createSkuSettingBody } },
    controller.createSkuSetting
  );

  fastify.put(
    "/:id",
    {
      preHandler: stockManagerOnly,
      schema: { params: idParam, body: updateSkuSettingBody },
    },
    controller.updateSkuSetting
  );

  fastify.patch(
    "/:id/counter",
    {
      preHandler: stockManagerOnly,
      schema: { params: idParam, body: patchCounterBody },
    },
    controller.updateCounter
  );

  fastify.delete(
    "/:id",
    { preHandler: stockManagerOnly, schema: { params: idParam } },
    controller.deleteSkuSetting
  );
}

module.exports = skuSettingRoutes;