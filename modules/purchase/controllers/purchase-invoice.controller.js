const purchaseInvoiceService = require("../services/purchase-invoice.service");

exports.getAllPurchaseInvoices = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseInvoiceService.getAllPurchaseInvoices());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPurchaseInvoiceById = async (req, reply) => {
  try {
    const invoice = await purchaseInvoiceService.getPurchaseInvoiceById(req.params.id);
    if (!invoice) {
      return reply.code(404).send({ message: "Purchase invoice not found" });
    }
    return reply.code(200).send(invoice);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createPurchaseInvoice = async (req, reply) => {
  try {
    const invoice = await purchaseInvoiceService.createPurchaseInvoice({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(invoice);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updatePurchaseInvoiceStatus = async (req, reply) => {
  try {
    return reply.code(200).send(
      await purchaseInvoiceService.updatePurchaseInvoiceStatus(req.params.id, req.body.status, req.body)
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
