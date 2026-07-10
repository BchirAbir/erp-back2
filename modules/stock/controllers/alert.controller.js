const alertService = require("../services/alert.service");
const { success, error } = require("../../../utils/response");

exports.getAllAlerts = async (req, reply) => {
  try {
    const data = await alertService.getAllAlerts();
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getOpenAlerts = async (req, reply) => {
  try {
    const data = await alertService.getOpenAlerts();
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getAlertsByProductId = async (req, reply) => {
  try {
    const data = await alertService.getAlertsByProductId(req.params.productId);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.updateAlertStatus = async (req, reply) => {
  try {
    const data = await alertService.updateAlertStatus(req.params.id, req.body.status);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};