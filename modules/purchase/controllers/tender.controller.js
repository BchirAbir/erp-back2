const tenderService = require("../services/tender.service");

exports.getAllTenders = async (req, reply) => {
  try {
    return reply.code(200).send(await tenderService.getAllTenders());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getTenderById = async (req, reply) => {
  try {
    const tender = await tenderService.getTenderById(req.params.id);
    if (!tender) {
      return reply.code(404).send({ message: "Tender not found" });
    }
    return reply.code(200).send(tender);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createTender = async (req, reply) => {
  try {
    const tender = await tenderService.createTender({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(tender);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateSuppliers = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await tenderService.updateSuppliers(req.params.id, req.body.supplierIds || []));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.sendTender = async (req, reply) => {
  try {
    return reply.code(200).send(await tenderService.sendTender(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.addOffer = async (req, reply) => {
  try {
    return reply.code(200).send(await tenderService.addOffer(req.params.id, req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createMissingPurchaseOrder = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await tenderService.createMissingPurchaseOrder(req.params.id, req.user?.id || null));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.selectOffer = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await tenderService.selectOffer(req.params.id, req.body.offerId, req.user?.id || null));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
