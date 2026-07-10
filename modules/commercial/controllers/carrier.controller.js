const carrierService = require("../services/carrier.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await carrierService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getActive = async (req, reply) => {
  try {
    return reply.code(200).send(await carrierService.getActive());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const carrier = await carrierService.getById(req.params.id);
    if (!carrier) return reply.code(404).send({ message: "Carrier not found" });
    return reply.code(200).send(carrier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    const carrier = await carrierService.create(req.body);
    return reply.code(201).send(carrier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const carrier = await carrierService.update(req.params.id, req.body);
    return reply.code(200).send(carrier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.toggleActive = async (req, reply) => {
  try {
    const carrier = await carrierService.toggleActive(req.params.id);
    return reply.code(200).send(carrier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
