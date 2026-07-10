const IntegrationEvent = require("../models/integration-event.model");

exports.createIntegrationEvent = async ({
  eventType,
  aggregateType,
  aggregateId,
  sourceModule = "STOCK",
  sourceId = "",
  payload = {},
}) => {
  return IntegrationEvent.create({
    eventType,
    aggregateType,
    aggregateId,
    sourceModule,
    sourceId,
    payload,
    status: "PENDING",
  });
};