const service = require("../services/supplementary-category.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await service.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getActive = async (req, reply) => {
  try {
    return reply.code(200).send(await service.getActive());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    return reply.code(201).send(await service.create(req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    return reply.code(200).send(await service.update(req.params.id, req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.delete = async (req, reply) => {
  try {
    await service.delete(req.params.id);
    return reply.code(204).send();
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
