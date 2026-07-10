const notificationService = require("../services/notification.service");

exports.getAll = async (req, reply) => {
  try {
    return reply.code(200).send(await notificationService.getAll());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.markRead = async (req, reply) => {
  try {
    return reply.code(200).send(await notificationService.markRead(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
