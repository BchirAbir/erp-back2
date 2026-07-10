// hr/payrollCron.js
// Automatic end-of-month payroll notification for Finance.
// Runs a daily check — on the last day of the month, computes the payroll
// summary and sends a one-time PAYROLL_READY notification to FINANCE_MANAGER.

const SystemNotification = require("../models/SystemNotification");

function isLastDayOfMonth() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getMonth() !== today.getMonth();
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function checkAndNotify() {
  if (!isLastDayOfMonth()) return;

  const month = getCurrentMonth();

  // Already notified this month?
  const existing = await SystemNotification.findOne({
    recipientRole: "FINANCE_MANAGER",
    type: "PAYROLL_READY",
    targetId: month,
  });
  if (existing) return;

  // Compute payroll for the current month
  const payrollService = require("./services/payrollsummary.service");
  const { totals } = await payrollService.getPayrollSummary(month);

  if (totals.totalNetSalary <= 0 && totals.totalEarned <= 0) return;

  await SystemNotification.create({
    recipientRole: "FINANCE_MANAGER",
    type: "PAYROLL_READY",
    message: `Payroll for ${month} is ready — ${totals.totalNetSalary.toLocaleString()} TND to disburse, ${totals.totalCnssTotal.toLocaleString()} TND CNSS to pay (${totals.employeeCount} employees).`,
    targetId: month,
    targetName: `Payroll ${month}`,
    actorName: "HR Payroll System",
  });

  console.log(`[PayrollCron] Finance notified for ${month}`);
}

// Run check every 12 hours (twice a day is enough to catch the last day)
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

function startPayrollCron() {
  // Check once on startup (in case server restarts on the last day)
  setTimeout(() => {
    checkAndNotify().catch(err =>
      console.error("[PayrollCron] Error:", err.message)
    );
  }, 10_000); // 10s after startup to let DB connect

  // Then check every 12 hours
  setInterval(() => {
    checkAndNotify().catch(err =>
      console.error("[PayrollCron] Error:", err.message)
    );
  }, TWELVE_HOURS);

  console.log("[PayrollCron] Scheduled — checks every 12h for end-of-month payroll");
}

module.exports = { startPayrollCron };
