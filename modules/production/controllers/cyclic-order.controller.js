const cyclicOrderService = require("../services/cyclic-order.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.send(await cyclicOrderService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDue = async (req, reply) => {
  try {
    return reply.send(await cyclicOrderService.getDue());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const data = await cyclicOrderService.getById(req.params.id);
    if (!data) return reply.code(404).send({ message: "Cyclic order not found" });
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    const data = await cyclicOrderService.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const data = await cyclicOrderService.update(req.params.id, req.body);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.toggleActive = async (req, reply) => {
  try {
    const data = await cyclicOrderService.toggleActive(req.params.id);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.fire = async (req, reply) => {
  try {
    const data = await cyclicOrderService.fire(req.params.id, req.user?.id || null);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
