const MarketingBudget = require("../../models/MarketingBudget");
const MarketingEvent  = require("../../models/MarketingEvent");

// ── Budget ────────────────────────────────────────────────────────────────────

async function getBudget(year) {
  let budget = await MarketingBudget.findOne({ year });
  if (!budget) {
    budget = await MarketingBudget.create({ year, annualBudget: 0 });
  }
  // Attach spent per month from events
  const events = await MarketingEvent.find({
    monthKey: { $regex: `^${year}-` },
    status:   { $ne: "Cancelled" },
  });
  const spentMap = {};
  for (const e of events) {
    spentMap[e.monthKey] = (spentMap[e.monthKey] || 0) + e.budget;
  }
  const allocations = budget.monthlyAllocations.map(m => ({
    month:     m.month,
    allocated: m.allocated,
    spent:     spentMap[m.month] || 0,
    remaining: Math.max(0, m.allocated - (spentMap[m.month] || 0)),
  }));
  return {
    _id:          budget._id,
    year:         budget.year,
    annualBudget: budget.annualBudget,
    totalAllocated: allocations.reduce((s, m) => s + m.allocated, 0),
    totalSpent:     allocations.reduce((s, m) => s + m.spent,     0),
    monthlyAllocations: allocations,
  };
}

async function setAnnualBudget(year, annualBudget, adminId) {
  let budget = await MarketingBudget.findOne({ year });
  if (!budget) budget = new MarketingBudget({ year, annualBudget: 0 });
  budget.annualBudget = annualBudget;
  budget.setByAdmin   = adminId;
  await budget.save();
  return getBudget(year);
}

async function updateMonthlyAllocations(year, allocations) {
  // allocations: [{ month: "YYYY-MM", allocated: number }]
  let budget = await MarketingBudget.findOne({ year });
  if (!budget) budget = new MarketingBudget({ year, annualBudget: 0 });
  for (const a of allocations) {
    const idx = budget.monthlyAllocations.findIndex(m => m.month === a.month);
    if (idx >= 0) budget.monthlyAllocations[idx].allocated = a.allocated;
  }
  await budget.save();
  return getBudget(year);
}

// ── Events ────────────────────────────────────────────────────────────────────

async function getEvents(monthKey) {
  const query = monthKey ? { monthKey } : {};
  return MarketingEvent.find(query).sort({ date: 1 });
}

async function createEvent(data, userId) {
  const monthKey = data.date.slice(0, 7); // "YYYY-MM"
  const event = await MarketingEvent.create({ ...data, monthKey, createdBy: userId });
  // Update spent on budget
  await syncSpent(monthKey);
  return event;
}

async function updateEvent(id, data) {
  const event = await MarketingEvent.findByIdAndUpdate(id, data, { new: true });
  if (event) await syncSpent(event.monthKey);
  return event;
}

async function deleteEvent(id) {
  const event = await MarketingEvent.findByIdAndDelete(id);
  if (event) await syncSpent(event.monthKey);
  return event;
}

async function requestExtraBudget(id, note) {
  const event = await MarketingEvent.findByIdAndUpdate(
    id,
    { budgetRequestStatus: "requested", budgetRequestNote: note || "" },
    { new: true }
  );

  // Notify Finance Manager about the extra budget request
  if (event) {
    try {
      const SystemNotification = require("../../models/SystemNotification");
      await SystemNotification.create({
        recipientRole: "FINANCE_MANAGER",
        type: "BUDGET_EXTRA_REQUEST",
        message: `Marketing requests extra budget for event "${event.title || "Untitled"}" (${event.monthKey}) — ${event.budget || 0} TND. ${note ? "Note: " + note : ""}`,
        targetId: String(event._id),
        targetName: event.title || "Marketing Event",
        actorName: "Marketing Department",
      });
    } catch (err) {
      console.error("[Marketing] Budget notification failed:", err.message);
    }
  }

  return event;
}

async function transferBudget(year, fromMonth, toMonth, amount) {
  // Move `amount` from fromMonth's allocation to toMonth's allocation
  const budget = await MarketingBudget.findOne({ year });
  if (!budget) throw Object.assign(new Error("Budget not found"), { statusCode: 404 });
  const from = budget.monthlyAllocations.find(m => m.month === fromMonth);
  const to   = budget.monthlyAllocations.find(m => m.month === toMonth);
  if (!from || !to) throw Object.assign(new Error("Month not found"), { statusCode: 400 });
  if (from.allocated < amount) throw Object.assign(new Error("Insufficient budget in source month"), { statusCode: 400 });
  from.allocated -= amount;
  to.allocated   += amount;
  await budget.save();
  return getBudget(year);
}

// Sync spent amount on budget doc
async function syncSpent(monthKey) {
  const year = parseInt(monthKey.split("-")[0]);
  const events = await MarketingEvent.find({ monthKey, status: { $ne: "Cancelled" } });
  const spent  = events.reduce((s, e) => s + e.budget, 0);
  await MarketingBudget.findOneAndUpdate(
    { year, "monthlyAllocations.month": monthKey },
    { $set: { "monthlyAllocations.$.spent": spent } }
  );
}

async function approveBudgetRequest(id, approverName) {
  const event = await MarketingEvent.findByIdAndUpdate(
    id,
    { budgetRequestStatus: "approved" },
    { new: true }
  );
  if (event) {
    try {
      const SystemNotification = require("../../models/SystemNotification");
      await SystemNotification.create({
        recipientRole: "MARKETING_MANAGER",
        type: "BUDGET_APPROVED",
        message: `Extra budget for event "${event.title || "Untitled"}" (${event.monthKey}) — ${event.budget || 0} TND has been approved by ${approverName}.`,
        targetId: String(event._id),
        targetName: event.title || "Marketing Event",
        actorName: approverName,
      });
    } catch (err) {
      console.error("[Marketing] Budget approval notification failed:", err.message);
    }
  }
  return event;
}

async function declineBudgetRequest(id, declinedByName, reason = "") {
  const event = await MarketingEvent.findByIdAndUpdate(
    id,
    { budgetRequestStatus: "declined" },
    { new: true }
  );
  if (event) {
    try {
      const SystemNotification = require("../../models/SystemNotification");
      await SystemNotification.create({
        recipientRole: "MARKETING_MANAGER",
        type: "BUDGET_DECLINED",
        message: `Extra budget for event "${event.title || "Untitled"}" (${event.monthKey}) has been declined by ${declinedByName}.${reason ? " Reason: " + reason : ""}`,
        targetId: String(event._id),
        targetName: event.title || "Marketing Event",
        actorName: declinedByName,
      });
    } catch (err) {
      console.error("[Marketing] Budget decline notification failed:", err.message);
    }
  }
  return event;
}

module.exports = {
  getBudget, setAnnualBudget, updateMonthlyAllocations,
  getEvents, createEvent, updateEvent, deleteEvent,
  requestExtraBudget, approveBudgetRequest, declineBudgetRequest, transferBudget,
};