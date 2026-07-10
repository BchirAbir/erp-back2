// controllers/auth.controller.js

const authService = require("../services/auth.service");

exports.login = async (req, reply) => {
  try {
    const result = await authService.login(req.body);
    return reply.status(200).send(result);
  } catch (err) {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.register = async (req, reply) => {
  try {
    const result = await authService.register(req.body);
    return reply.status(201).send(result);
  } catch (err)
   {
    return reply.status(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getMe = async (req, reply) => {
  try {
    const user = await authService.getMe(req.user._id);
    return reply.status(200).send(user);
  } catch (err) {
    return reply.status(500).send({ message: err.message });
  }
};
