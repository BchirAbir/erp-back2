const Depot = require("../models/depot.model");
const User = require("../../../models/User");

const ALLOWED_MANAGER_ROLES = ["DEPOT_MANAGER", "STOCK_MANAGER"];

const validateManager = async (managerId) => {
  const manager = await User.findById(managerId);

  if (!manager) {
    throw Object.assign(new Error("Depot manager not found"), { statusCode: 404 });
  }

  if (!ALLOWED_MANAGER_ROLES.includes(manager.role)) {
    throw Object.assign(
      new Error("Selected user must have role DEPOT_MANAGER or STOCK_MANAGER"),
      { statusCode: 400 }
    );
  }

  return manager;
};

exports.getAllDepots = async () => {
  return Depot.find()
    .populate("managerId", "name email role department")
    .sort({ createdAt: -1 });
};

exports.getMyDepot = async (userId) => {
  return Depot.findOne({ managerId: userId }).populate("managerId", "name email role department");
};

exports.getDepotById = async (id) => {
  return Depot.findById(id).populate("managerId", "name email role department");
};

exports.createDepot = async ({ name, address, managerId, productTypeScope, status }) => {
  await validateManager(managerId);

  const depot = await Depot.create({
    name,
    address,
    managerId,
    productTypeScope,
    status: status || "ACTIVE",
  });

  return Depot.findById(depot._id).populate("managerId", "name email role department");
};

exports.updateDepot = async (
  id,
  { name, address, managerId, productTypeScope, status }
) => {
  const existing = await Depot.findById(id);
  if (!existing) {
    throw Object.assign(new Error("Depot not found"), { statusCode: 404 });
  }

  if (managerId) {
    await validateManager(managerId);
  }

  existing.name = name ?? existing.name;
  existing.address = address ?? existing.address;
  existing.managerId = managerId ?? existing.managerId;
  existing.productTypeScope = productTypeScope ?? existing.productTypeScope;
  existing.status = status ?? existing.status;

  await existing.save();

  return Depot.findById(existing._id).populate("managerId", "name email role department");
};

exports.deleteDepot = async (id) => {
  const depot = await Depot.findById(id);
  if (!depot) {
    throw Object.assign(new Error("Depot not found"), { statusCode: 404 });
  }

  await Depot.findByIdAndDelete(id);
  return { message: "Depot deleted successfully" };
};