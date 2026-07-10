const service = require("../services/supplementary-request.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await service.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const data = await service.getById(req.params.id);
    if (!data) return reply.code(404).send({ message: "Demande introuvable" });
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    const data = await service.create({ ...req.body, createdBy: req.user?._id || null });
    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.submit = async (req, reply) => {
  try {
    const data = await service.updateStatus(req.params.id, { status: "SUBMITTED" }, req.user?._id || null);
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateStatus = async (req, reply) => {
  try {
    const data = await service.updateStatus(req.params.id, req.body, req.user?._id || null);
    return reply.code(200).send(data);
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
