const backOrderService = require("../services/backorder.service");

exports.getAll = async (req, reply) => {
  try {
    const backorders = await backOrderService.getAll();
    return reply.code(200).send(backorders);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getById = async (req, reply) => {
  try {
    const bo = await backOrderService.getById(req.params.id);
    if (!bo) return reply.code(404).send({ message: "Backorder not found" });
    return reply.code(200).send(bo);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.fulfill = async (req, reply) => {
  try {
    const bo = await backOrderService.fulfillBackOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(bo);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancel = async (req, reply) => {
  try {
    const bo = await backOrderService.cancelBackOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(bo);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.requestProduction = async (req, reply) => {
  try {
    const bo = await backOrderService.requestProduction(req.params.id, req.user?.id || null);
    return reply.code(200).send(bo);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.markProductionDone = async (req, reply) => {
  try {
    const bo = await backOrderService.markProductionDone(req.params.id);
    return reply.code(200).send(bo);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
