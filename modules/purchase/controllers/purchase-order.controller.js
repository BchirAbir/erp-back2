const purchaseOrderService = require("../services/purchase-order.service");

exports.getAllPurchaseOrders = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseOrderService.getAllPurchaseOrders());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPendingDeliveries = async (req, reply) => {
  try {
    return reply.code(200).send(
      await purchaseOrderService.getPendingDeliveries(req.user?.role, req.user?.id)
    );
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPurchaseOrderById = async (req, reply) => {
  try {
    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(req.params.id);
    if (!purchaseOrder) {
      return reply.code(404).send({ message: "Purchase order not found" });
    }
    return reply.code(200).send(purchaseOrder);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createPurchaseOrder = async (req, reply) => {
  try {
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(purchaseOrder);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updatePurchaseOrderStatus = async (req, reply) => {
  try {
    return reply
      .code(200)
      .send(await purchaseOrderService.updatePurchaseOrderStatus(req.params.id, req.body.status));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancelPurchaseOrder = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseOrderService.cancelPurchaseOrder(req.params.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
