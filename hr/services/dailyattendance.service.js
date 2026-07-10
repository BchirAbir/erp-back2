const DailyAttendance = require("../../models/DailyAttendance");
const User = require("../../models/User");

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function computeHours(checkIn, checkOut) {
  const inMin  = toMinutes(checkIn);
  const outMin = toMinutes(checkOut);
  if (inMin === null || outMin === null || outMin <= inMin)
    return { hoursWorked: 0, extraHours: 0 };
  const worked = (outMin - inMin) / 60;
  const extra  = Math.max(0, worked - 8);
  return {
    hoursWorked: Math.round(worked * 100) / 100,
    extraHours:  Math.round(extra  * 100) / 100,
  };
}

function computeStatus(checkIn, isAbsent) {
  if (isAbsent || !checkIn) return "Absent";
  const minutes = toMinutes(checkIn);
  if (minutes >= 10 * 60) return "Absent";   // 10:00 or later → Absent
  if (minutes >= 8 * 60)  return "Late";     // 08:00–09:59 → Late
  return "Present";                           // before 08:00 → Present
}

async function upsertRecord({ employeeId, date, checkIn, checkOut, isAbsent, note, recordedBy }) {
  const emp = await User.findById(employeeId);
  if (!emp) throw new Error("Employee not found");

  const { hoursWorked, extraHours } = isAbsent
    ? { hoursWorked: 0, extraHours: 0 }
    : computeHours(checkIn, checkOut);

  const status = computeStatus(checkIn, isAbsent);

  return DailyAttendance.findOneAndUpdate(
    { employeeId, date },
    {
      employeeName: emp.name,
      department:   emp.department,
      checkIn:      isAbsent ? "" : (checkIn  || ""),
      checkOut:     isAbsent ? "" : (checkOut || ""),
      status,
      hoursWorked,
      extraHours,
      note:         note       || "",
      recordedBy:   recordedBy || "",
    },
    { upsert: true, new: true }
  );
}

async function getRecords(filters = {}) {
  const query = {};
  if (filters.employeeId) query.employeeId = filters.employeeId;
  if (filters.department) query.department = filters.department;
  if (filters.date)       query.date       = filters.date;
  if (filters.month)      query.date       = { $regex: `^${filters.month}` };
  return DailyAttendance.find(query).sort({ date: -1, employeeName: 1 });
}

// Returns per-employee: presentDays, absentDays, lateDays, totalExtraHours, totalHoursWorked
async function getMonthlySummary(month, department) {
  const query = { date: { $regex: `^${month}` } };
  if (department) query.department = department;
  const records = await DailyAttendance.find(query);

  const map = {};
  for (const r of records) {
    const id = r.employeeId.toString();
    if (!map[id]) map[id] = {
      employeeId: id, employeeName: r.employeeName, department: r.department,
      presentDays: 0, absentDays: 0, lateDays: 0, totalExtraHours: 0, totalHoursWorked: 0,
    };
    if (r.status === "Present") map[id].presentDays++;
    if (r.status === "Absent")  map[id].absentDays++;
    if (r.status === "Late")    { map[id].lateDays++; map[id].presentDays++; }
    map[id].totalExtraHours  += r.extraHours  || 0;
    map[id].totalHoursWorked += r.hoursWorked || 0;
  }
  return Object.values(map);
}

async function deleteRecord(id) {
  return DailyAttendance.findByIdAndDelete(id);
}

module.exports = { upsertRecord, getRecords, getMonthlySummary, deleteRecord };
