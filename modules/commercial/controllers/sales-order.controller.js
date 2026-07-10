const salesOrderService = require("../services/sales-order.service");

exports.getAllOrders = async (req, reply) => {
  try {
    const orders = await salesOrderService.getAllOrders();
    return reply.code(200).send(orders);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getOrdersPaginated = async (req, reply) => {
  try {
    const { page, limit, search, status } = req.query || {};
    const result = await salesOrderService.getOrdersPaginated({ page, limit, search, status });
    return reply.code(200).send(result);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getOrderById = async (req, reply) => {
  try {
    const order = await salesOrderService.getOrderById(req.params.id);

    if (!order) {
      return reply.code(404).send({ message: "Sales order not found" });
    }

    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.createOrder({
      ...req.body,
      createdBy: req.user?.id || null,
    });

    return reply.code(201).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.confirmOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.confirmOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.ordonanceOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.ordonanceOrder(
      req.params.id,
      {
        plannedStartDate: req.body?.plannedStartDate,
        plannedEndDate: req.body?.plannedEndDate,
        lines: req.body?.lines || [],
      },
      req.user?.id || null
    );
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.ordonanceOrders = async (req, reply) => {
  try {
    const orders = await salesOrderService.ordonanceOrders(
      req.body?.orders || [],
      req.user?.id || null
    );
    return reply.code(200).send(orders);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.requestProduction = async (req, reply) => {
  try {
    const backorder = await salesOrderService.requestProduction(
      req.params.id,
      { lines: req.body?.lines || [] },
      req.user?.id || null
    );
    return reply.code(200).send(backorder);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.prepareOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.prepareOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.markPickingSlipPrinted = async (req, reply) => {
  try {
    const order = await salesOrderService.markPickingSlipPrinted(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.validatePacking = async (req, reply) => {
  try {
    const order = await salesOrderService.validatePacking(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.cancelOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.cancelOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.shipOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.shipOrder(req.params.id, req.user?.id || null, {
      trackingNumber: req.body?.trackingNumber || "",
      carrierId: req.body?.carrierId || null,
      vehicleId: req.body?.vehicleId || null,
      shippingCost: req.body?.shippingCost || 0,
      shipmentAddress: req.body?.shipmentAddress || "",
    });
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deliverOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.deliverOrder(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.markUrgent = async (req, reply) => {
  try {
    const urgent = req.body?.urgent !== false;
    const order = await salesOrderService.markUrgent(req.params.id, urgent);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.requestShipApproval = async (req, reply) => {
  try {
    const order = await salesOrderService.requestShipApproval(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.approveShip = async (req, reply) => {
  try {
    const order = await salesOrderService.approveShip(req.params.id, req.user?.id || null);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.closeOrder = async (req, reply) => {
  try {
    const order = await salesOrderService.closeOrder(req.params.id);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.markReturned = async (req, reply) => {
  try {
    const order = await salesOrderService.markReturned(req.params.id);
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.reorder = async (req, reply) => {
  try {
    const order = await salesOrderService.reorder(req.params.id, req.user?.id || null);
    return reply.code(201).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.rejectShip = async (req, reply) => {
  try {
    const order = await salesOrderService.rejectShip(
      req.params.id,
      req.user?.id || null,
      req.body?.reason || ""
    );
    return reply.code(200).send(order);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
