const Campaign = require("../../models/Campaign");

exports.getAll = (filters = {}) => {
  const query = {};
  if (filters.status)  query.status  = filters.status;
  if (filters.channel) query.channel = filters.channel;

  // ── Month filter (YYYY-MM) ─────────────────────────────────────────────────
  // Matches campaigns whose startDate falls within the requested month
  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m,     1); // exclusive
    query.startDate = {
      $gte: start.toISOString().slice(0, 10),
      $lt:  end.toISOString().slice(0, 10),
    };
  }

  return Campaign.find(query).sort({ createdAt: -1 });
};

exports.getStats = async (filters = {}) => {
  const campaigns = await exports.getAll(filters);
  const totalLeads  = campaigns.reduce((s, c) => s + (c.leads  || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpend  = campaigns.reduce((s, c) => s + (c.spend  || 0), 0);
  const cpl = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;
  const roi = totalSpend > 0 ? Math.round((totalLeads / totalSpend) * 1000) / 1000 : 0;
  return {
    total:       campaigns.length,
    active:      campaigns.filter(c => c.status === "Active").length,
    totalLeads,
    totalBudget,
    totalSpend,
    cpl,
    roi,
  };
};

// Group campaigns by startDate month → monthly leads + spend
exports.getMonthlyLeads = async (year) => {
  const query = { startDate: { $ne: "" } };

  // If year provided, filter to that year only
  if (year) {
    query.startDate = {
      $gte: `${year}-01-01`,
      $lte: `${year}-12-31`,
    };
  }

  const campaigns = await Campaign.find(query);
  const map = {};
  for (const c of campaigns) {
    const month = c.startDate.slice(0, 7);
    if (!map[month]) map[month] = { month, leads: 0, spend: 0 };
    map[month].leads += c.leads || 0;
    map[month].spend += c.spend || 0;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
};

exports.getAnalytics = async (filters = {}) => {
  const campaigns = await exports.getAll(filters);
  if (!campaigns.length) return { kpis: { openRate: 0, ctr: 0, conversionRate: 0, impressions: 0 }, byChannel: [], monthly: [] };

  const avg = (arr, field) => arr.length ? Math.round(arr.reduce((s, c) => s + (c[field] || 0), 0) / arr.length * 10) / 10 : 0;
  const withOpen = campaigns.filter(c => c.openRate > 0);
  const withCtr  = campaigns.filter(c => c.ctr > 0);
  const withConv = campaigns.filter(c => c.conversionRate > 0);

  const kpis = {
    openRate:       avg(withOpen, "openRate"),
    ctr:            avg(withCtr, "ctr"),
    conversionRate: avg(withConv, "conversionRate"),
    impressions:    campaigns.reduce((s, c) => s + (c.impressions || 0), 0),
  };

  const channelMap = {};
  for (const c of campaigns) {
    if (!channelMap[c.channel]) channelMap[c.channel] = { channel: c.channel, openRates: [], ctrs: [], convRates: [] };
    if (c.openRate > 0)       channelMap[c.channel].openRates.push(c.openRate);
    if (c.ctr > 0)            channelMap[c.channel].ctrs.push(c.ctr);
    if (c.conversionRate > 0) channelMap[c.channel].convRates.push(c.conversionRate);
  }

  const byChannel = Object.values(channelMap).map(ch => ({
    channel: ch.channel,
    open: ch.openRates.length ? Math.round(ch.openRates.reduce((s, v) => s + v, 0) / ch.openRates.length) : 0,
    ctr:  ch.ctrs.length      ? Math.round(ch.ctrs.reduce((s, v) => s + v, 0)      / ch.ctrs.length)      : 0,
    conv: ch.convRates.length ? Math.round(ch.convRates.reduce((s, v) => s + v, 0) / ch.convRates.length * 10) / 10 : 0,
  }));

  const monthly = await exports.getMonthlyLeads(filters.month?.slice(0, 4) || filters.year);
  return { kpis, byChannel, monthly };
};

exports.create = (data) => Campaign.create(data);

exports.update = (id, data) =>
  Campaign.findByIdAndUpdate(id, data, { new: true, runValidators: true });

exports.remove = (id) => Campaign.findByIdAndDelete(id);