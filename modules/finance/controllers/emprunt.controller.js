const empruntService = require("../services/emprunt.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await empruntService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    return reply.code(200).send(await empruntService.getById(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.create = async (req, reply) => {
  try {
    return reply.code(201).send(await empruntService.create(req.body, req.user?._id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.addPayment = async (req, reply) => {
  try {
    return reply.code(200).send(await empruntService.addPayment(req.params.id, req.body, req.user?._id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deletePayment = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await empruntService.deletePayment(req.params.id, req.params.paymentId));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.remove = async (req, reply) => {
  try {
    await empruntService.remove(req.params.id);
    return reply.code(204).send();
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};