// controllers/admin.controller.js

const adminService = require("../services/admin.service");
const { success, error, notFound } = require("../../utils/response");

exports.getStats = async (req, reply) => {
  try { return success(reply, await adminService.getStats()); }
  catch (err) { return error(reply, err.message); }
};

exports.getAllUsers = async (req, reply) => {
  try { return success(reply, await adminService.getAllUsers()); }
  catch (err) { return error(reply, err.message); }
};

exports.getUserById = async (req, reply) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) return notFound(reply, "User not found");
    return success(reply, user);
  } catch (err) { return error(reply, err.message); }
};

exports.createUser = async (req, reply) => {
  try {
    const user = await adminService.createUser(req.body);
    return success(reply, user, 201);
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.updateUser = async (req, reply) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    return success(reply, user);
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.deleteUser = async (req, reply) => {
  try {
    const user = await adminService.deleteUser(req.params.id);
    if (!user) return notFound(reply, "User not found");
    return success(reply, { message: "User deleted successfully" });
  } catch (err) { return error(reply, err.message); }
};

exports.resetPassword = async (req, reply) => {
  try {
    const result = await adminService.resetPassword(req.params.id, req.body.newPassword);
    // Log who the reset was for
    return success(reply, result);
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

// ── Activity log endpoints ────────────────────────────────────────────────────

exports.getActivityLogs = async (req, reply) => {
  try {
    const { limit, department, userId } = req.query;
    const logs = await adminService.getActivityLogs({ limit, department, userId });
    return success(reply, logs);
  } catch (err) { return error(reply, err.message); }
};

exports.getActivityStats = async (req, reply) => {
  try { return success(reply, await adminService.getActivityStats()); }
  catch (err) { return error(reply, err.message); }
};
