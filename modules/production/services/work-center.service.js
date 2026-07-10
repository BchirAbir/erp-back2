const WorkCenter = require("../models/work-center.model");
const ProductionOrder = require("../models/production-order.model");

exports.getAll = () => WorkCenter.find().sort({ createdAt: -1 });

exports.getActive = () => WorkCenter.find({ active: true }).sort({ name: 1 });

exports.getById = (id) => WorkCenter.findById(id);

exports.create = async ({ name, code, type, capacityPerDay, notes }) => {
  const existing = await WorkCenter.findOne({ code: code.toUpperCase() });
  if (existing)
    throw Object.assign(new Error("Work center code already exists"), { statusCode: 409 });
  return WorkCenter.create({ name, code, type, capacityPerDay, notes });
};

exports.update = (id, data) =>
  WorkCenter.findByIdAndUpdate(id, data, { new: true, runValidators: true });

exports.toggleActive = async (id) => {
  const wc = await WorkCenter.findById(id);
  if (!wc) throw Object.assign(new Error("Work center not found"), { statusCode: 404 });
  wc.active = !wc.active;
  return wc.save();
};

// Returns all non-cancelled orders for this work center within [from, to]
exports.getSchedule = (id, from, to) =>
  ProductionOrder.find({
    workCenterId: id,
    status: { $nin: ["CANCELLED"] },
    scheduledStart: { $lte: new Date(to) },
    scheduledEnd: { $gte: new Date(from) },
  })
    .populate("productId", "name sku")
    .sort({ scheduledStart: 1 });
