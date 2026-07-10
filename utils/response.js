// utils/response.js

exports.success = (reply, data, statusCode = 200) => {
  return reply.status(statusCode).send(data);
};

exports.error = (reply, message, statusCode = 500) => {
  return reply.status(statusCode).send({ message });
};

exports.notFound = (reply, message = "Not found") => {
  return reply.status(404).send({ message });
};