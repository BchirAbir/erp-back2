const { protect, requireRole } = require("../../../hooks/auth.hook");
const controller = require("../controllers/purchase-setting.controller");
const { updatePurchaseSettingsBody } = require("../schemas/purchase-setting.schema");

async function purchaseSettingRoutes(fastify) {
  const access = [protect, requireRole("ADMIN", "PURCHASE_MANAGER")];

  fastify.get("/", { preHandler: access }, controller.getSettings);
  fastify.put("/", { preHandler: access, schema: { body: updatePurchaseSettingsBody } }, controller.updateSettings);
}

module.exports = purchaseSettingRoutes;
