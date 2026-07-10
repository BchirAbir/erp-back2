const vehicleService = require("../services/vehicle.service");

const handle = (fn) => async (req, reply) => {
  try { reply.send(await fn(req)); }
  catch (err) { reply.code(err.statusCode || 500).send({ message: err.message }); }
};

exports.getAll = handle(() => vehicleService.getAll());
exports.getActive = handle(() => vehicleService.getActive());
exports.getById = handle((req) => vehicleService.getById(req.params.id));
exports.create = handle((req) => vehicleService.create(req.body));
exports.update = handle((req) => vehicleService.update(req.params.id, req.body));
exports.toggleActive = handle((req) => vehicleService.toggleActive(req.params.id));
exports.getDeliveries = handle((req) => vehicleService.getDeliveries(req.params.id));
