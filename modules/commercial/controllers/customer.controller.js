const customerService = require("../services/customer.service");

const handle = (fn) => async (req, reply) => {
  try {
    const result = await fn(req, reply);
    reply.send(result);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getAll = handle(() => customerService.getAll());
exports.getActive = handle(() => customerService.getActive());
exports.getById = handle((req) => customerService.getById(req.params.id));
exports.create = handle((req) => customerService.create(req.body));
exports.update = handle((req) => customerService.update(req.params.id, req.body));
exports.toggleActive = handle((req) => customerService.toggleActive(req.params.id));
