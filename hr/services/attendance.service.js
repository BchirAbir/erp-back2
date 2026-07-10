const Attendance = require("../../models/Attendance");
const User       = require("../../models/User");

async function createRequest({ employeeId, date, type, hours, note }) {
  const emp = await User.findById(employeeId);
  if (!emp) throw new Error("Employee not found");
  return Attendance.create({
    employeeId, date, type, hours: hours || "8h", note: note || "",
    employeeName: emp.name, department: emp.department, status: "Pending",
  });
}

async function getRequests(filters = {}) {
  const query = {};
  if (filters.status)     query.status     = filters.status;
  if (filters.department) query.department = filters.department;
  if (filters.type)       query.type       = filters.type;
  if (filters.employeeId) query.employeeId = filters.employeeId;
  return Attendance.find(query).sort({ createdAt: -1 });
}

async function updateStatus(id, status, approvedBy) {
  return Attendance.findByIdAndUpdate(
    id,
    { status, approvedBy: approvedBy || "" },
    { new: true }
  );
}

async function approveAll(approvedBy) {
  return Attendance.updateMany(
    { status: "Pending" },
    { status: "Approved", approvedBy: approvedBy || "" }
  );
}

async function deleteRequest(id) {
  return Attendance.findByIdAndDelete(id);
}

module.exports = { createRequest, getRequests, updateStatus, approveAll, deleteRequest };
