const workCenterService = require("../services/work-center.service");

exports.getAll = async (req, reply) => {
  const data = await workCenterService.getAll();
  return reply.send(data);
};

exports.getActive = async (req, reply) => {
  const data = await workCenterService.getActive();
  return reply.send(data);
};

exports.getById = async (req, reply) => {
  const data = await workCenterService.getById(req.params.id);
  if (!data) return reply.status(404).send({ message: "Work center not found" });
  return reply.send(data);
};

exports.create = async (req, reply) => {
  try {
    const data = await workCenterService.create(req.body);
    return reply.status(201).send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.update = async (req, reply) => {
  const data = await workCenterService.update(req.params.id, req.body);
  if (!data) return reply.status(404).send({ message: "Work center not found" });
  return reply.send(data);
};

exports.toggleActive = async (req, reply) => {
  try {
    const data = await workCenterService.toggleActive(req.params.id);
    return reply.send(data);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getSchedule = async (req, reply) => {
  const { from, to } = req.query;
  const data = await workCenterService.getSchedule(req.params.id, from, to);
  return reply.send(data);
};
