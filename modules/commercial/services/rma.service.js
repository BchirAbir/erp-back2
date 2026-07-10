const RMA = require("../models/rma.model");
const SalesOrder = require("../models/sales-order.model");
const stockMovementService = require("../../stock/services/stock-movement.service");

async function generateRmaNo() {
  const latest = await RMA.findOne().sort({ createdAt: -1 }).select("rmaNo");
  const latestNo = String(latest?.rmaNo || "");
  const latestSeq = latestNo.startsWith("RMA-")
    ? Number(latestNo.replace("RMA-", "")) || 0
    : 0;
  return `RMA-${latestSeq + 1}`;
}

const populateRma = (query) =>
  query
    .populate("salesOrderId", "orderNo status deliveredAt closedAt")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role")
    .populate("handledBy", "name email role");

exports.getAll = async () => populateRma(RMA.find()).sort({ createdAt: -1 });

exports.getById = async (id) => populateRma(RMA.findById(id));

exports.create = async ({ salesOrderId, lines, notes = "", createdBy = null }) => {
  const order = await SalesOrder.findById(salesOrderId).populate("lines.productId", "name sku");
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (!["DELIVERED", "CLOSED"].includes(order.status)) {
    throw Object.assign(
      new Error("An RMA can only be created for delivered or closed orders"),
      { statusCode: 400 }
    );
  }

  const orderLineMap = new Map(
    order.lines.map((line) => [String(line.productId?._id || line.productId), line.quantity])
  );

  for (const line of lines) {
    const orderedQty = orderLineMap.get(String(line.productId));
    if (!orderedQty) {
      throw Object.assign(
        new Error(`Product ${line.productId} does not belong to sales order ${order.orderNo}`),
        { statusCode: 400 }
      );
    }
    if (line.quantity > orderedQty) {
      throw Object.assign(
        new Error(`Return quantity for product ${line.productId} exceeds ordered quantity`),
        { statusCode: 400 }
      );
    }
  }

  const rma = await RMA.create({
    rmaNo: await generateRmaNo(),
    salesOrderId,
    orderNo: order.orderNo,
    customerName: order.customerName,
    lines,
    notes,
    createdBy,
  });

  return populateRma(RMA.findById(rma._id));
};

exports.receive = async (id, userId = null) => {
  const rma = await RMA.findById(id);
  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (rma.status !== "OPEN") {
    throw Object.assign(new Error("Only open RMAs can be received"), { statusCode: 400 });
  }

  rma.status = "RECEIVED";
  rma.receivedAt = new Date();
  rma.handledBy = userId;
  await rma.save();

  return populateRma(RMA.findById(rma._id));
};

exports.process = async (id, { resolution, notes = "" }, userId = null) => {
  const rma = await RMA.findById(id);
  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (rma.status !== "RECEIVED") {
    throw Object.assign(new Error("Only received RMAs can be processed"), { statusCode: 400 });
  }

  if (resolution === "RESTOCK") {
    for (const line of rma.lines) {
      await stockMovementService.createEntry({
        productId: line.productId,
        quantity: line.quantity,
        sourceModule: "COMMERCIAL",
        sourceType: "RMA_RESTOCK",
        sourceId: String(rma._id),
        reference: rma.rmaNo,
        reason: "Customer return restocked",
        notes: line.reason || notes || `Returned from ${rma.orderNo}`,
        createdBy: userId,
      });
    }
    rma.status = "RESTOCKED";
  } else {
    rma.status = "DISPOSED";
  }

  rma.resolution = resolution;
  rma.notes = notes || rma.notes;
  rma.handledBy = userId;
  rma.processedAt = new Date();
  await rma.save();

  return populateRma(RMA.findById(rma._id));
};

exports.close = async (id, userId = null) => {
  const rma = await RMA.findById(id);
  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (!["RESTOCKED", "DISPOSED"].includes(rma.status)) {
    throw Object.assign(new Error("Only processed RMAs can be closed"), { statusCode: 400 });
  }

  rma.status = "CLOSED";
  rma.closedAt = new Date();
  rma.handledBy = userId;
  await rma.save();

  return populateRma(RMA.findById(rma._id));
};

exports.cancel = async (id, userId = null) => {
  const rma = await RMA.findById(id);
  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (["RESTOCKED", "DISPOSED", "CLOSED"].includes(rma.status)) {
    throw Object.assign(new Error("Processed or closed RMAs cannot be cancelled"), {
      statusCode: 400,
    });
  }

  rma.status = "CANCELLED";
  rma.cancelledAt = new Date();
  rma.handledBy = userId;
  await rma.save();

  return populateRma(RMA.findById(rma._id));
};
