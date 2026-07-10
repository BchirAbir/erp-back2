const purchaseSettingService = require("../services/purchase-setting.service");

exports.getSettings = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseSettingService.getSettings());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateSettings = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseSettingService.updateSettings(req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
