const Carrier = require("../models/carrier.model");

exports.getAll = async () => Carrier.find().sort({ name: 1 });

exports.getActive = async () => Carrier.find({ active: true }).sort({ name: 1 });

exports.getById = async (id) => Carrier.findById(id);

exports.create = async ({
  name,
  code,
  contactEmail = "",
  contactPhone = "",
  baseRateFlat = 0,
  transitDays = 2,
  notes = "",
}) => {
  const exists = await Carrier.findOne({ code: code.trim().toUpperCase() });
  if (exists) {
    throw Object.assign(new Error("Carrier code already exists"), { statusCode: 400 });
  }
  return Carrier.create({ name, code, contactEmail, contactPhone, baseRateFlat, transitDays, notes });
};

exports.update = async (id, data) => {
  const carrier = await Carrier.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!carrier) {
    throw Object.assign(new Error("Carrier not found"), { statusCode: 404 });
  }
  return carrier;
};

exports.toggleActive = async (id) => {
  const carrier = await Carrier.findById(id);
  if (!carrier) {
    throw Object.assign(new Error("Carrier not found"), { statusCode: 404 });
  }
  carrier.active = !carrier.active;
  await carrier.save();
  return carrier;
};
