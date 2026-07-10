const purchaseRequestService = require("../services/purchase-request.service");

exports.getAllPurchaseRequests = async (req, reply) => {
  try {
    const data = await purchaseRequestService.getAllPurchaseRequests();
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPurchaseRequestById = async (req, reply) => {
  try {
    const data = await purchaseRequestService.getPurchaseRequestById(req.params.id);

    if (!data) {
      return reply.code(404).send({ message: "Purchase request not found" });
    }

    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createPurchaseRequest = async (req, reply) => {
  try {
    const data = await purchaseRequestService.createPurchaseRequest({
      ...req.body,
      createdBy: req.user?.id || null,
    });

    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createPurchaseRequestFromAlert = async (req, reply) => {
  try {
    const data = await purchaseRequestService.createFromAlert({
      alertId: req.params.id,
      ...req.body,
      createdBy: req.user?.id || null,
    });

    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updatePurchaseRequestStatus = async (req, reply) => {
  try {
    const data = await purchaseRequestService.updatePurchaseRequestStatus(
      req.params.id,
      req.body,
      req.user?.id || null
    );

    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};