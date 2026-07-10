const thresholdService = require("../services/threshold.service");
const { success, error } = require("../../../utils/response");

exports.getAllRules = async (req, reply) => {
  try {
    const data = await thresholdService.getAllRules();
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getRuleById = async (req, reply) => {
  try {
    const data = await thresholdService.getRuleById(req.params.id);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getRuleByProductId = async (req, reply) => {
  try {
    const data = await thresholdService.getRuleByProductId(req.params.productId);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.createRule = async (req, reply) => {
  try {
    const data = await thresholdService.createRule({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return success(reply, data, 201);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.updateRule = async (req, reply) => {
  try {
    const data = await thresholdService.updateRule(req.params.id, {
      ...req.body,
      updatedBy: req.user?.id || null,
    });
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.deleteRule = async (req, reply) => {
  try {
    const data = await thresholdService.deleteRule(req.params.id);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};