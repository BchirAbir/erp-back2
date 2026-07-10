const StockAlert = require("../models/stock-alert.model");

exports.getAllAlerts = async () => {
  return StockAlert.find()
    .populate("productId")
    .populate("thresholdRuleId")
    .populate("triggeredByMovementId")
    .sort({ createdAt: -1 });
};

exports.getOpenAlerts = async () => {
  return StockAlert.find({ status: "OPEN" })
    .populate("productId")
    .populate("thresholdRuleId")
    .populate("triggeredByMovementId")
    .sort({ createdAt: -1 });
};

exports.getAlertsByProductId = async (productId) => {
  return StockAlert.find({ productId })
    .populate("productId")
    .populate("thresholdRuleId")
    .populate("triggeredByMovementId")
    .sort({ createdAt: -1 });
};

exports.updateAlertStatus = async (id, status) => {
  const alert = await StockAlert.findById(id);
  if (!alert) {
    throw Object.assign(new Error("Stock alert not found"), { statusCode: 404 });
  }

  alert.status = status;
  await alert.save();

  return alert.populate("productId");
};