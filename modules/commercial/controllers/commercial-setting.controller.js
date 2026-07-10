const svc = require("../services/commercial-setting.service");

exports.get = async (req, reply) => {
  try {
    return reply.send(await svc.get());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    return reply.send(await svc.update(req.body || {}));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
