const PurchaseRequest = require("../models/purchase-request.model");
const StockAlert = require("../../stock/models/stock-alert.model");

const populateRequest = (query) =>
  query
    .populate("productId")
    .populate("sourceAlertId")
    .populate("createdBy", "name email role")
    .populate("handledBy", "name email role");

exports.getAllPurchaseRequests = async () => {
  return populateRequest(PurchaseRequest.find()).sort({ createdAt: -1 });
};

exports.getPurchaseRequestById = async (id) => {
  return populateRequest(PurchaseRequest.findById(id));
};

exports.createPurchaseRequest = async ({
  requestNo,
  productId,
  requestedQuantity,
  department = "STOCK",
  availableBudget = 0,
  reason,
  priority = "NORMAL",
  status = "DRAFT",
  sourceAlertId = null,
  createdBy = null,
  notes = "",
}) => {
  const exists = await PurchaseRequest.findOne({
    requestNo: requestNo.trim().toUpperCase(),
  });

  if (exists) {
    throw Object.assign(new Error("Purchase request number already exists"), {
      statusCode: 400,
    });
  }

  const request = await PurchaseRequest.create({
    requestNo: requestNo.trim().toUpperCase(),
    productId,
    requestedQuantity,
    department: String(department || "STOCK").trim().toUpperCase(),
    availableBudget,
    reason,
    priority,
    status,
    sourceAlertId,
    createdBy,
    notes,
    submittedAt: status === "SUBMITTED" ? new Date() : null,
  });

  return exports.getPurchaseRequestById(request._id);
};

exports.createFromAlert = async ({
  alertId,
  requestNo,
  requestedQuantity,
  department = "STOCK",
  availableBudget = 0,
  reason = "Purchase request generated from stock alert",
  priority = "NORMAL",
  createdBy = null,
  notes = "",
}) => {
  const alert = await StockAlert.findById(alertId).populate("productId");
  if (!alert) {
    throw Object.assign(new Error("Stock alert not found"), { statusCode: 404 });
  }

  if (alert.status !== "OPEN") {
    throw Object.assign(new Error("Only open alerts can generate purchase requests"), {
      statusCode: 400,
    });
  }

  const request = await exports.createPurchaseRequest({
    requestNo,
    productId: alert.productId._id,
    requestedQuantity,
    department,
    availableBudget,
    reason,
    priority,
    status: "SUBMITTED",
    sourceAlertId: alert._id,
    createdBy,
    notes,
  });

  alert.status = "PENDING";
  alert.actionType = "PURCHASE";
  alert.actionSourceId = request._id;
  alert.handledBy = createdBy;
  alert.handledAt = new Date();
  await alert.save();

  return request;
};

exports.updatePurchaseRequestStatus = async (id, { status, notes = "" }, userId = null) => {
  const request = await PurchaseRequest.findById(id);
  if (!request) {
    throw Object.assign(new Error("Purchase request not found"), { statusCode: 404 });
  }

  const currentStatus = request.status;
  const allowedTransitions = {
    DRAFT: ["SUBMITTED", "REJECTED"],
    SUBMITTED: ["APPROVED", "REJECTED"],
    APPROVED: [],
    REJECTED: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(status)) {
    throw Object.assign(
      new Error(`Cannot move purchase request from ${currentStatus} to ${status}`),
      { statusCode: 400 }
    );
  }

  request.status = status;
  request.handledBy = userId || request.handledBy;
  request.notes = notes || request.notes;

  if (status === "SUBMITTED") {
    request.submittedAt = new Date();
  }

  if (status === "APPROVED") {
    request.approvedAt = new Date();
    request.completedAt = new Date();
  }

  if (status === "REJECTED") {
    request.rejectedAt = new Date();
  }

  await request.save();

  if (request.sourceAlertId) {
    const alert = await StockAlert.findById(request.sourceAlertId);
    if (alert) {
      if (status === "APPROVED") {
        alert.status = "CLOSED";
        alert.closedAt = new Date();
      }

      if (status === "REJECTED") {
        alert.status = "OPEN";
        alert.actionType = null;
        alert.actionSourceId = null;
        alert.handledBy = null;
        alert.handledAt = null;
      }

      if (status === "SUBMITTED") {
        alert.status = "PENDING";
      }

      await alert.save();
    }
  }

  return exports.getPurchaseRequestById(request._id);
};
