const depotService = require("../services/depot.service");
const User = require("../../../models/User");

exports.getDepotManagers = async (req, reply) => {
  try {
    const managers = await User.find({ role: "DEPOT_MANAGER" }).select("_id name email role").sort({ name: 1 });
    return reply.code(200).send(managers);
  } catch (err) {
    return reply.code(500).send({ message: err.message });
  }
};

exports.getMyDepot = async (req, reply) => {
  try {
    const depot = await depotService.getMyDepot(req.user?.id);
    return reply.code(200).send(depot || null);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getAllDepots = async (req, reply) => {
  try {
    const depots = await depotService.getAllDepots();
    return reply.code(200).send(depots);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDepotById = async (req, reply) => {
  try {
    const depot = await depotService.getDepotById(req.params.id);

    if (!depot) {
      return reply.code(404).send({ message: "Depot not found" });
    }

    return reply.code(200).send(depot);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createDepot = async (req, reply) => {
  try {
    const depot = await depotService.createDepot(req.body);
    return reply.code(201).send(depot);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateDepot = async (req, reply) => {
  try {
    const depot = await depotService.updateDepot(req.params.id, req.body);
    return reply.code(200).send(depot);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deleteDepot = async (req, reply) => {
  try {
    const result = await depotService.deleteDepot(req.params.id);
    return reply.code(200).send(result);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};