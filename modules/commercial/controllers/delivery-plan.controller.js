const deliveryPlanService = require("../services/delivery-plan.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await deliveryPlanService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.getById(req.params.id);
    if (!plan) return reply.code(404).send({ message: "Delivery plan not found" });
    return reply.code(200).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getUnassignedOrders = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await deliveryPlanService.getUnassignedShippedOrders());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDiscoveredZones = async (req, reply) => {
  try {
    return reply.code(200).send(await deliveryPlanService.getDiscoveredZones());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.startDelivery = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.startDelivery(req.params.id);
    return reply.code(200).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.complete = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.complete(req.params.id, {
      distanceKm: req.body?.distanceKm ?? null,
    });
    return reply.code(200).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.returnPlan = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.returnPlan(
      req.params.id,
      req.user?.id || null,
      req.body?.reason || "",
      req.body?.orderId || null
    );
    return reply.code(200).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancel = async (req, reply) => {
  try {
    const plan = await deliveryPlanService.cancel(req.params.id);
    return reply.code(200).send(plan);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
