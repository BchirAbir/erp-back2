const Segment = require("../../models/Segment");

const getAll = async (filters = {}) => {
  const query = {};
  if (filters.status)  query.status  = filters.status;
  if (filters.channel) query.channel = filters.channel;

  // ── Month filter (YYYY-MM) ─────────────────────────────────────────────────
  // Matches segments created within the requested month
  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m,     1); // exclusive
    query.createdAt = { $gte: start, $lt: end };
  }

  return Segment.find(query).sort({ createdAt: -1 });
};

const getStats = async (filters = {}) => {
  const all = await getAll(filters);
  return {
    total:          all.length,
    totalCustomers: all.reduce((s, r) => s + r.customers, 0),
    growing:        all.filter(r => r.status === "Growing").length,
    atRisk:         all.filter(r => r.status === "At Risk" || r.status === "Declining").length,
  };
};

const create = (data) => Segment.create(data);

const update = (id, data) =>
  Segment.findByIdAndUpdate(id, data, { new: true, runValidators: true });

const remove = (id) => Segment.findByIdAndDelete(id);

module.exports = { getAll, getStats, create, update, remove };