const purchasePaymentService = require("../services/purchase-payment.service");

exports.getAllPurchasePayments = async (req, reply) => {
  try {
    return reply.code(200).send(await purchasePaymentService.getAllPurchasePayments());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPaymentSummary = async (req, reply) => {
  try {
    return reply.code(200).send(await purchasePaymentService.getPaymentSummary());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createPurchasePayment = async (req, reply) => {
  try {
    const payment = await purchasePaymentService.createPurchasePayment({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(payment);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
