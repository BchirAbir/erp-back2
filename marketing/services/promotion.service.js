const Promotion = require("../../models/Promotion");

exports.getAll = (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.type)   query.type   = filters.type;

  // ── Month filter (YYYY-MM) ─────────────────────────────────────────────────
  // Matches promotions whose startDate falls within the requested month
  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m,     1); // exclusive
    query.startDate = {
      $gte: start.toISOString().slice(0, 10),
      $lt:  end.toISOString().slice(0, 10),
    };
  }

  return Promotion.find(query).sort({ createdAt: -1 });
};

exports.getStats = async (filters = {}) => {
  const promotions = await exports.getAll(filters);
  const discounts = promotions.map(p => p.discount);
  const avgDiscount = discounts.length
    ? Math.round(discounts.reduce((s, d) => s + d, 0) / discounts.length * 10) / 10
    : 0;
  return {
    total:      promotions.length,
    active:     promotions.filter(p => p.status === "Active").length,
    scheduled:  promotions.filter(p => p.status === "Scheduled").length,
    avgDiscount,
  };
};

exports.create = (data) => Promotion.create(data);

exports.update = (id, data) =>
  Promotion.findByIdAndUpdate(id, data, { new: true, runValidators: true });

exports.remove = (id) => Promotion.findByIdAndDelete(id);