const rmaService = require("../services/rma.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await rmaService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const rma = await rmaService.getById(req.params.id);
    if (!rma) return reply.code(404).send({ message: "RMA not found" });
    return reply.code(200).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    const rma = await rmaService.create({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.receive = async (req, reply) => {
  try {
    const rma = await rmaService.receive(req.params.id, req.user?.id || null);
    return reply.code(200).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.process = async (req, reply) => {
  try {
    const rma = await rmaService.process(req.params.id, req.body, req.user?.id || null);
    return reply.code(200).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.close = async (req, reply) => {
  try {
    const rma = await rmaService.close(req.params.id, req.user?.id || null);
    return reply.code(200).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancel = async (req, reply) => {
  try {
    const rma = await rmaService.cancel(req.params.id, req.user?.id || null);
    return reply.code(200).send(rma);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
