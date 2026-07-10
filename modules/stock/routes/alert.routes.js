const { protect } = require("../../../hooks/auth.hook");
const alertController = require("../controllers/alert.controller");
const {
  idParam,
  productIdParam,
  updateAlertStatusBody,
} = require("../schemas/threshold.schema");

async function alertRoutes(fastify) {
  const stockAccess = [protect];

  fastify.get(
    "/",
    { preHandler: stockAccess, schema: { tags: ["Alerts"] } },
    alertController.getAllAlerts
  );

  fastify.get(
    "/open",
    { preHandler: stockAccess, schema: { tags: ["Alerts"] } },
    alertController.getOpenAlerts
  );

  fastify.get(
    "/product/:productId",
    { preHandler: stockAccess, schema: { params: productIdParam, tags: ["Alerts"] } },
    alertController.getAlertsByProductId
  );

  fastify.patch(
    "/:id/status",
    {
      preHandler: stockAccess,
      schema: { params: idParam, body: updateAlertStatusBody, tags: ["Alerts"] }
    },
    alertController.updateAlertStatus
  );
}

module.exports = alertRoutes;