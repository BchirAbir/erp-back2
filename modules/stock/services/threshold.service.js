const ThresholdRule = require("../models/threshold-rule.model");
const Product = require("../models/product.model");

exports.getAllRules = async () => {
  return ThresholdRule.find()
    .populate("productId")
    .sort({ createdAt: -1 });
};

exports.getRuleById = async (id) => {
  const rule = await ThresholdRule.findById(id).populate("productId");
  if (!rule) {
    throw Object.assign(new Error("Threshold rule not found"), { statusCode: 404 });
  }
  return rule;
};

exports.getRuleByProductId = async (productId) => {
  const rule = await ThresholdRule.findOne({ productId }).populate("productId");
  if (!rule) {
    throw Object.assign(new Error("Threshold rule not found for this product"), { statusCode: 404 });
  }
  return rule;
};

exports.createRule = async ({
  productId,
  minQuantity,
  alertEnabled = true,
  isActive = true,
  notifyRoles = ["ADMIN"],
  createdBy = null,
}) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  const exists = await ThresholdRule.findOne({ productId });
  if (exists) {
    throw Object.assign(new Error("Threshold rule already exists for this product"), { statusCode: 400 });
  }

  return ThresholdRule.create({
    productId,
    minQuantity,
    alertEnabled,
    isActive,
    notifyRoles,
    createdBy,
    updatedBy: createdBy,
  });
};

exports.updateRule = async (
  id,
  { minQuantity, alertEnabled, isActive, notifyRoles, updatedBy = null }
) => {
  const rule = await ThresholdRule.findById(id);
  if (!rule) {
    throw Object.assign(new Error("Threshold rule not found"), { statusCode: 404 });
  }

  if (minQuantity !== undefined) rule.minQuantity = minQuantity;
  if (alertEnabled !== undefined) rule.alertEnabled = alertEnabled;
  if (isActive !== undefined) rule.isActive = isActive;
  if (notifyRoles !== undefined) rule.notifyRoles = notifyRoles;
  rule.updatedBy = updatedBy;

  await rule.save();
  return rule.populate("productId");
};

exports.deleteRule = async (id) => {
  const rule = await ThresholdRule.findById(id);
  if (!rule) {
    throw Object.assign(new Error("Threshold rule not found"), { statusCode: 404 });
  }

  await rule.deleteOne();
  return { message: "Threshold rule deleted successfully" };
};