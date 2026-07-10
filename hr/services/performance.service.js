// services/performance.service.js
const Performance = require("../../models/Performance");
const User        = require("../../models/User");

function deriveRating(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Average";
  return "Poor";
}

exports.getAll = (filters = {}) => {
  const query = {};
  if (filters.cycle)      query.cycle      = filters.cycle;
  if (filters.department) query.department = filters.department;
  if (filters.rating)     query.rating     = filters.rating;
  if (filters.employeeId) query.employeeId = filters.employeeId;
  return Performance.find(query).sort({ score: -1, createdAt: -1 });
};

exports.getStats = async (cycle) => {
  const filter = cycle ? { cycle } : {};
  const records = await Performance.find(filter);
  if (!records.length) return { avg: 0, total: 0, byRating: [], byCycle: [] };

  const avg = Math.round(records.reduce((s, r) => s + r.score, 0) / records.length);

  const byRating = ["Excellent", "Good", "Average", "Poor"].map(rating => ({
    rating,
    count: records.filter(r => r.rating === rating).length,
  }));

  const cycleMap = {};
  for (const r of records) {
    if (!cycleMap[r.cycle]) cycleMap[r.cycle] = { cycle: r.cycle, count: 0, totalScore: 0 };
    cycleMap[r.cycle].count++;
    cycleMap[r.cycle].totalScore += r.score;
  }
  const byCycle = Object.values(cycleMap).map(c => ({
    cycle: c.cycle,
    count: c.count,
    avg: Math.round(c.totalScore / c.count),
  }));

  return { avg, total: records.length, byRating, byCycle };
};

exports.upsert = async (data) => {
  const { employeeId, cycle, score, notes, reviewDate, managerId } = data;

  const emp = await User.findById(employeeId).select("-password");
  if (!emp) throw Object.assign(new Error("Employee not found"), { statusCode: 404 });

  let managerName = "";
  if (managerId) {
    const mgr = await User.findById(managerId).select("name");
    if (mgr) managerName = mgr.name;
  }

  const rating = deriveRating(score);

  return Performance.findOneAndUpdate(
    { employeeId, cycle },
    {
      employeeName: emp.name,
      department:   emp.department,
      position:     emp.position || "",
      managerId:    managerId || null,
      managerName,
      score,
      rating,
      cycle,
      reviewDate:   reviewDate || new Date().toISOString().split("T")[0],
      notes:        notes || "",
    },
    { upsert: true, new: true }
  );
};

exports.delete = (id) => Performance.findByIdAndDelete(id);
