const skuSettingService = require("../services/sku-setting.service");

exports.getAllSkuSettings = async (req, reply) => {
  try {
    const data = await skuSettingService.getAllSkuSettings();
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getSkuSettingById = async (req, reply) => {
  try {
    const data = await skuSettingService.getSkuSettingById(req.params.id);
    if (!data) {
      return reply.code(404).send({ message: "SKU setting not found" });
    }
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createSkuSetting = async (req, reply) => {
  try {
    const data = await skuSettingService.createSkuSetting({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateSkuSetting = async (req, reply) => {
  try {
    const data = await skuSettingService.updateSkuSetting(req.params.id, req.body);
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateCounter = async (req, reply) => {
  try {
    const data = await skuSettingService.updateCounter(req.params.id, req.body.counter);
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deleteSkuSetting = async (req, reply) => {
  try {
    const data = await skuSettingService.deleteSkuSetting(req.params.id);
    return reply.code(200).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};