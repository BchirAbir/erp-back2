const customerInvoiceService = require("../services/customer-invoice.service");

exports.getAllInvoices = async (req, reply) => {
  try {
    return reply.code(200).send(await customerInvoiceService.getAllInvoices());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getInvoiceById = async (req, reply) => {
  try {
    const invoice = await customerInvoiceService.getInvoiceById(req.params.id);
    if (!invoice) return reply.code(404).send({ message: "Customer invoice not found" });
    return reply.code(200).send(invoice);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getInvoiceByOrderId = async (req, reply) => {
  try {
    const invoice = await customerInvoiceService.getInvoiceByOrderId(req.params.orderId);
    if (!invoice) return reply.code(404).send({ message: "Customer invoice not found" });
    return reply.code(200).send(invoice);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.configureInvoice = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.configureInvoice(req.params.id, req.body || {})
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.finalizeInvoice = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.finalizeInvoice(req.params.id, req.user?.id || null, req.body || {})
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.registerPayment = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.registerPayment(req.params.id, req.body || {})
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.clearChequePayment = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.clearChequePayment(req.params.id, req.body?.paymentId)
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.sendInvoice = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.sendInvoice(req.params.id, req.user?.id || null, req.body || {})
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.sendReminder = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.sendReminder(req.params.id, req.user?.id || null, req.body || {})
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getAllKumbilInvoices = async (req, reply) => {
  try {
    return reply.code(200).send(await customerInvoiceService.getAllKumbilInvoices());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancelInstallment = async (req, reply) => {
  try {
    return reply.code(200).send(
      await customerInvoiceService.cancelInstallment(req.params.id, Number(req.params.index))
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
