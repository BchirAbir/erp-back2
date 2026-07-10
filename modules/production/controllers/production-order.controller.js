const productionOrderService = require("../services/production-order.service");

exports.getAll = async (req, reply) => {
  const data = await productionOrderService.getAll();
  return reply.send(data);
};

exports.getTimeline = async (req, reply) => {
  const { from, to } = req.query;
  const data = await productionOrderService.getTimeline(from, to);
  return reply.send(data);
};

exports.getById = async (req, reply) => {
  const data = await productionOrderService.getById(req.params.id);
  if (!data) return reply.status(404).send({ message: "Production order not found" });
  return reply.send(data);
};

exports.create = async (req, reply) => {
  try {
    const data = await productionOrderService.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.status(201).send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.schedule = async (req, reply) => {
  try {
    const data = await productionOrderService.schedule(req.params.id, req.body);
    return reply.send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.start = async (req, reply) => {
  try {
    const data = await productionOrderService.start(req.params.id);
    return reply.send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.complete = async (req, reply) => {
  try {
    const data = await productionOrderService.complete(
      req.params.id,
      req.body?.completedQty || null,
      req.user?.id || null
    );
    return reply.send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancel = async (req, reply) => {
  try {
    const data = await productionOrderService.cancel(req.params.id);
    return reply.send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createFromBackOrder = async (req, reply) => {
  try {
    const data = await productionOrderService.createFromBackOrder(
      req.params.backorderId,
      req.user?.id || null
    );
    return reply.status(201).send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};
