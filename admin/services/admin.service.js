// services/admin.service.js

const User     = require("../../models/User");
const AuditLog = require("../../models/AuditLog");

const ROLE_DEPARTMENT_MAP = {
  HR_MANAGER:         "HR",
  MARKETING_MANAGER:  "Marketing",
  SALES_MANAGER:      "Online Sales",
  ADMIN:              "None",
};

const ROLE_POSITION_MAP = {
  ADMIN:              "Administrator",
  HR_MANAGER:         "HR Manager",
  MARKETING_MANAGER:  "Marketing Manager",
  SALES_MANAGER:      "Sales Manager",
};

// Roles that own a login account and are pre-approved when created by an Admin
const MANAGER_ROLES = [
  "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER",
  "FINANCE_MANAGER", "COMMERCIAL_MANAGER", "STOCK_MANAGER",
  "PURCHASE_MANAGER", "PRODUCTION_MANAGER", "MAINTENANCE_MANAGER",
  "DEPOT_MANAGER",
];

exports.getDepartmentForRole = (role, department) =>
  ROLE_DEPARTMENT_MAP[role] || department || "None";

exports.getPositionForRole = (role, existingPosition) =>
  ROLE_POSITION_MAP[role] || existingPosition || "Employee";

exports.getStats = async () => {
  const [totalUsers, byRole] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
  ]);
  return { totalUsers, byRole };
};

exports.getAllUsers = () =>
  User.find().select("-password").sort({ createdAt: -1 });

exports.getUserById = (id) =>
  User.findById(id).select("-password");

exports.createUser = async ({ name, email, password, role, department, position }) => {
  const exists = await User.findOne({ email });
  if (exists) throw Object.assign(new Error("Email already in use"), { statusCode: 409 });

  const assignedDept     = exports.getDepartmentForRole(role, department);
  const assignedPosition = exports.getPositionForRole(role, position);

  // Admin-created accounts are pre-approved: managers/admin → "approved",
  // plain employees have no login account → "none".
  const accountStatus =
    role === "ADMIN" || MANAGER_ROLES.includes(role) ? "approved" : "none";

  const user = await User.create({
    name, email, password, role,
    department: assignedDept,
    position:   assignedPosition,
    accountStatus,
  });

  return {
    id: user._id, name: user.name, email: user.email,
    role: user.role, department: user.department, position: user.position,
  };
};

exports.updateUser = async (id, { name, email, role, department, position, status }) => {
  const oldUser = await User.findById(id);
  if (!oldUser) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  // Status-only update (e.g. On Leave)
  if (status && !name && !email && !role) {
    return User.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).select("-password");
  }

  const assignedDept     = exports.getDepartmentForRole(role, department);
  const assignedPosition = exports.getPositionForRole(role, position || oldUser.position);

  return User.findByIdAndUpdate(
    id,
    { name, email, role, department: assignedDept, position: assignedPosition, ...(status && { status }) },
    { new: true, runValidators: true }
  ).select("-password");
};

exports.deleteUser = (id) => User.findByIdAndDelete(id);

exports.resetPassword = async (id, newPassword) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  user.password = newPassword;   // pre-save hook hashes it
  await user.save();

  return { tempPassword: newPassword };
};

// ── Audit log queries ─────────────────────────────────────────────────────────

exports.getActivityLogs = async ({ limit = 100, department, userId } = {}) => {
  const filter = {};
  if (department) filter.department = department;
  if (userId)     filter.userId     = userId;

  return AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

exports.getActivityStats = async () => {
  const [total, byDept, byAction, byUser] = await Promise.all([
    AuditLog.countDocuments(),
    AuditLog.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]),
    AuditLog.aggregate([{ $group: { _id: "$action",     count: { $sum: 1 } } }]),
    AuditLog.aggregate([
      { $group: { _id: { userId: "$userId", userName: "$userName", userRole: "$userRole" }, count: { $sum: 1 }, lastAction: { $max: "$createdAt" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);
  return { total, byDept, byAction, byUser };
};