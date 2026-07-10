const purchaseReturnService = require("../services/purchase-return.service");

exports.getAllReturns = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseReturnService.getAllReturns());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getReturnById = async (req, reply) => {
  try {
    const ret = await purchaseReturnService.getReturnById(req.params.id);
    if (!ret) return reply.code(404).send({ message: "Purchase return not found" });
    return reply.code(200).send(ret);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getMyReturns = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseReturnService.getMyReturns(req.user?.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createReturn = async (req, reply) => {
  try {
    const ret = await purchaseReturnService.createReturn({
      receiptId: req.body.receiptId,
      reason: req.body.reason,
      notes: req.body.notes || "",
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(ret);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateReturnStatus = async (req, reply) => {
  try {
    const ret = await purchaseReturnService.updateReturnStatus(
      req.params.id,
      req.body.status,
      req.user?.id || null,
      req.user?.role || null
    );
    return reply.code(200).send(ret);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
