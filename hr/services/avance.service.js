const Avance = require("../../models/Avance");
const User   = require("../../models/User");

// ── Notify helper ──────────────────────────────────────────────────────────
async function notify(recipientRole, type, message, targetId, targetName, actorName) {
  try {
    const SystemNotification = require("../../models/SystemNotification");
    await SystemNotification.create({ recipientRole, type, message, targetId, targetName, actorName });
  } catch (err) {
    console.error("[Avance] Notification failed:", err.message);
  }
}

// ── Create advance (HR → notify Finance) ──────────────────────────────────
exports.createAvance = async (data) => {
  const avance = await Avance.create(data);

  // Notify Finance Manager that an advance request needs approval
  await notify(
    "FINANCE_MANAGER",
    "ADVANCE_REQUESTED",
    `Salary advance requested for ${data.employeeName || "an employee"} — ${data.amount} TND. Reason: ${data.reason || "N/A"}.`,
    String(avance._id),
    `Advance ${data.employeeName}`,
    "HR Department"
  );

  return avance;
};

// ── List avances ──────────────────────────────────────────────────────────
exports.getAvances = (filters = {}) => {
  const query = {};
  if (filters.employeeId) query.employeeId = filters.employeeId;
  if (filters.status)     query.status = filters.status;
  if (filters.department) query.department = filters.department;
  return Avance.find(query).sort({ createdAt: -1 });
};

// ── Approve & deduct (Finance → notify HR) ────────────────────────────────
exports.approveAndDeduct = async (id, approverName) => {
  const avance = await Avance.findById(id);
  if (!avance) throw new Error("Avance not found");
  if (avance.status !== "Pending") throw new Error("Avance already processed");

  const employee = await User.findById(avance.employeeId);
  if (!employee) throw new Error("Employee not found");

  const salaryBefore = employee.salary;
  const salaryAfter  = Math.max(0, salaryBefore - avance.amount);

  // Deduct from salary
  await User.findByIdAndUpdate(avance.employeeId, { salary: salaryAfter });

  // Update avance record
  const updated = await Avance.findByIdAndUpdate(id, {
    status:       "Deducted",
    approvedBy:   approverName,
    approvedAt:   new Date(),
    deductedAt:   new Date(),
    salaryBefore,
    salaryAfter,
  }, { new: true });

  // Notify HR Manager that Finance approved the advance
  await notify(
    "HR_MANAGER",
    "ADVANCE_APPROVED",
    `Salary advance of ${avance.amount} TND for ${avance.employeeName || "employee"} has been approved by ${approverName}. Salary updated: ${salaryBefore} → ${salaryAfter} TND.`,
    String(avance._id),
    `Advance ${avance.employeeName}`,
    approverName
  );

  return updated;
};

// ── Decline (Finance → notify HR) ─────────────────────────────────────────
exports.declineAvance = async (id, declinedByName, reason = "") => {
  const avance = await Avance.findById(id);
  if (!avance) throw new Error("Avance not found");
  if (avance.status !== "Pending") throw new Error("Avance already processed");

  const updated = await Avance.findByIdAndUpdate(id, {
    status:     "Rejected",
    approvedBy: declinedByName,
    approvedAt: new Date(),
  }, { new: true });

  // Notify HR Manager that Finance declined the advance
  await notify(
    "HR_MANAGER",
    "ADVANCE_DECLINED",
    `Salary advance of ${avance.amount} TND for ${avance.employeeName || "employee"} has been declined by ${declinedByName}.${reason ? " Reason: " + reason : ""}`,
    String(avance._id),
    `Advance ${avance.employeeName}`,
    declinedByName
  );

  return updated;
};

// ── Delete ────────────────────────────────────────────────────────────────
exports.deleteAvance = (id) => Avance.findByIdAndDelete(id);