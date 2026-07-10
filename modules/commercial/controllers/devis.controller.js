const devisService = require("../services/devis.service");

exports.getAllDevis = async (req, reply) => {
  try {
    return reply.code(200).send(await devisService.getAllDevis());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDevisById = async (req, reply) => {
  try {
    const devis = await devisService.getDevisById(req.params.id);
    if (!devis) return reply.code(404).send({ message: "Devis not found" });
    return reply.code(200).send(devis);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDevisByOrderId = async (req, reply) => {
  try {
    const devis = await devisService.getDevisByOrderId(req.params.orderId);
    if (!devis) return reply.code(404).send({ message: "Devis not found" });
    return reply.code(200).send(devis);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.acceptDevis = async (req, reply) => {
  try {
    return reply.code(200).send(await devisService.acceptDevis(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deleteDevis = async (req, reply) => {
  try {
    return reply.code(200).send(await devisService.deleteDevis(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createInvoiceFromDevis = async (req, reply) => {
  try {
    return reply.code(201).send(await devisService.createInvoiceFromDevisById(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
