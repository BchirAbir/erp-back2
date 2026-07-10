// services/payrollSummary.service.js
// Read-only service — produces the monthly payroll data Finance needs.
// Finance module calls GET /api/payroll/summary?month=YYYY-MM

const User            = require("../../models/User");
const DailyAttendance = require("../../models/DailyAttendance");
const Avance          = require("../../models/Avance");

// ── Pay cycle rule ────────────────────────────────────────────────────────────
// Employee joined ON the last day of the month → no pay this month
function isExcludedByPayCycle(emp, month) {
  if (!emp.joinedDate) return false;
  const joinDate = new Date(emp.joinedDate);
  const lastDay  = new Date(month + "-01");
  lastDay.setMonth(lastDay.getMonth() + 1);
  lastDay.setDate(0);
  joinDate.setHours(0, 0, 0, 0);
  lastDay.setHours(0, 0, 0, 0);
  return joinDate.getTime() === lastDay.getTime();
}

// ── Sunday check ──────────────────────────────────────────────────────────────
// Sunday (day 0) is the default weekend — absences on Sundays are not counted.
function isSunday(dateStr) {
  const d = new Date(dateStr);
  return d.getDay() === 0;
}

// ── CNSS constants (Tunisian Labour Law) ─────────────────────────────────────
const CNSS_EMPLOYEE_RATE = 0.0967;  // 9.67%  deducted from brut (employee's share)
const CNSS_EMPLOYER_RATE = 0.2000;  // 20.00% paid by employer on top of brut
const CNSS_TOTAL_RATE    = 0.2967;  // 29.67% total

// salary field = agreed monthly salary (base rate).
// Hourly rate = salary / 26 / 8 = salary / 208.
// Earned salary = hourly × actual hours worked.
// Brut = earned / (1 - 9.67%) — grossed up from earned.
// CNSS is calculated from brut.
// IRPP = 0, CSS = 0 — not applied.
// Net = earned - avances.

function calcPayroll(emp, att, avances, month) {
  if (isExcludedByPayCycle(emp, month)) {
    return {
      employeeId: String(emp._id), employeeName: emp.name,
      department: emp.department,  position: emp.position || "",
      agreedNet: emp.salary || 0,
      brutMonthly: 0, effectiveBase: 0, overtimePay: 0, absenceDeduction: 0,
      absentDays: 0, grossSalary: 0,
      cnssEmployee: 0, cnssEmployer: 0, cnssTotal: 0,
      irpp: 0, css: 0, imposable: 0,
      avanceDeductions: 0, netSalary: 0,
      note: "Joined on last day of month — excluded from this pay cycle",
    };
  }

  const agreedNet   = emp.salary || 0;
  // Hourly rate from the agreed salary (NOT from brut)
  const hourly      = agreedNet / 208;
  const daily       = agreedNet / 26;

  const hoursWorked    = att ? (att.totalHoursWorked || 0) : 0;
  const extraHours     = att ? (att.totalExtraHours  || 0) : 0;
  const absentDays     = att ? (att.absentDays       || 0) : 0;

  // Earned salary = what the employee actually earned based on hours worked
  const earnedSalary     = hoursWorked === 0 ? 0 : Math.round(hourly * hoursWorked);
  const overtimePay      = Math.round(hourly * extraHours);
  const absenceDeduction = Math.round(daily  * absentDays);

  // Gross salary (brut) = earned salary grossed up by 9.67%
  const grossSalary    = hoursWorked === 0 ? 0 : Math.round(earnedSalary / (1 - CNSS_EMPLOYEE_RATE));

  // CNSS from the grossed-up earned salary
  const cnssEmployee   = hoursWorked === 0 ? 0 : Math.round(grossSalary * CNSS_EMPLOYEE_RATE);
  const cnssEmployer   = hoursWorked === 0 ? 0 : Math.round(grossSalary * CNSS_EMPLOYER_RATE);
  const cnssTotal      = cnssEmployee + cnssEmployer;

  // IRPP and CSS are NOT applied — always 0
  const irpp = 0;
  const css  = 0;
  const imposable = 0;

  const avTotal = avances
    .filter(a => String(a.employeeId) === String(emp._id) &&
      (a.status === "Deducted" || a.status === "Approved" || a.status === "approved"))
    .reduce((s, a) => s + (a.amount || 0), 0);

  // Net = earned salary − avances only (no IRPP, no CSS, CNSS is informational)
  const netSalary = earnedSalary - avTotal;

  return {
    employeeId:       String(emp._id),
    employeeName:     emp.name,
    department:       emp.department,
    position:         emp.position || "",
    agreedNet,           // salary as stored — the agreed monthly rate
    brutMonthly: grossSalary, // brut = earned grossed up by 9.67%
    effectiveBase: earnedSalary, // earned salary based on hours
    overtimePay,
    absenceDeduction,
    absentDays,
    hoursWorked,
    grossSalary,         // = brut (earned + 9.67%)
    cnssEmployee,        // 9.67% of brut
    cnssEmployer,        // 20.00% of brut
    cnssTotal,           // 29.67% of brut
    irpp,                // always 0
    css,                 // always 0
    imposable,           // always 0
    avanceDeductions: avTotal,
    netSalary,
  };
}

// ── Attendance aggregation ────────────────────────────────────────────────────
async function getAttMap(month) {
  const records = await DailyAttendance.find({ date: { $regex: `^${month}` } });
  const map = {};
  for (const r of records) {
    const id = String(r.employeeId);
    if (!map[id]) map[id] = {
      presentDays: 0, absentDays: 0, lateDays: 0,
      totalExtraHours: 0, totalHoursWorked: 0,
    };
    // Sunday is the default weekend — skip absent records on Sundays
    if (r.status === "Absent" && isSunday(r.date)) continue;

    if (r.status === "Present") map[id].presentDays++;
    if (r.status === "Absent")  map[id].absentDays++;
    if (r.status === "Late")    { map[id].lateDays++; map[id].presentDays++; }
    map[id].totalExtraHours  += r.extraHours  || 0;
    map[id].totalHoursWorked += r.hoursWorked || 0;
  }
  return map;
}

// ── Main export ───────────────────────────────────────────────────────────────
exports.getPayrollSummary = async (month) => {
  const [employees, avances, attMap] = await Promise.all([
    // Include all staff — employees AND managers
    User.find({
      role: { $in: ["EMPLOYEE", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER"] }
    }).select("-password"),
    Avance.find(),
    getAttMap(month),
  ]);

  const rows = employees.map(emp =>
    calcPayroll(emp, attMap[String(emp._id)], avances, month)
  );

  // Totals for Finance — what the company needs to pay out
  const totals = {
    month,
    totalAgreedNet:        rows.reduce((s, r) => s + r.agreedNet,         0),
    totalBrut:             rows.reduce((s, r) => s + r.brutMonthly,       0),
    totalEarned:           rows.reduce((s, r) => s + r.effectiveBase,     0),
    totalOvertime:         rows.reduce((s, r) => s + r.overtimePay,       0),
    totalCnssEmployee:     rows.reduce((s, r) => s + r.cnssEmployee,      0),
    totalCnssEmployer:     rows.reduce((s, r) => s + r.cnssEmployer,      0),
    totalCnssTotal:        rows.reduce((s, r) => s + r.cnssTotal,         0),
    totalIrpp:             0,
    totalCss:              0,
    totalAvances:          rows.reduce((s, r) => s + r.avanceDeductions,  0),
    totalNetSalary:        rows.reduce((s, r) => s + r.netSalary,         0),
    employeeCount:         rows.length,
  };

  // Notify Finance Manager (once per month, non-blocking)
  notifyFinance(month, totals).catch(() => {});

  return { month, totals, employees: rows };
};

// ── Auto-notify Finance ───────────────────────────────────────────────────────
// After computing a payroll summary with at least one paid employee,
// send a one-time notification to the FINANCE_MANAGER so they know the
// payroll is ready and how much CNSS the company owes.
async function notifyFinance(month, totals) {
  if (totals.totalNetSalary <= 0) return; // nobody worked — nothing to pay
  try {
    const SystemNotification = require("../../models/SystemNotification");
    const existing = await SystemNotification.findOne({
      recipientRole: "FINANCE_MANAGER",
      type: "PAYROLL_READY",
      targetId: month,
    });
    if (existing) return; // already notified for this month

    await SystemNotification.create({
      recipientRole: "FINANCE_MANAGER",
      type: "PAYROLL_READY",
      message: `Payroll for ${month} is ready — ${totals.totalNetSalary.toLocaleString()} TND to disburse, ${totals.totalCnssTotal.toLocaleString()} TND CNSS to pay (${totals.employeeCount} employees).`,
      targetId: month,
      targetName: `Payroll ${month}`,
      actorName: "HR Payroll System",
    });
  } catch (err) {
    console.error("[HR] Failed to notify Finance:", err.message);
  }
}