const Emprunt = require("../models/emprunt.model");

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

async function generateEmpruntNo() {
  const docs = await Emprunt.find({ empruntNo: /^EMP-\d+$/ }).select("empruntNo").lean();
  const max = docs.reduce((m, d) => {
    const n = parseInt((d.empruntNo || "").replace("EMP-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

// Recompute amountPaid + status from the payments list
function recompute(emprunt) {
  const paid = roundAmount(emprunt.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
  emprunt.amountPaid = paid;
  emprunt.status = paid >= Number(emprunt.totalAmount) - 0.001 ? "SETTLED" : "OPEN";
}

exports.getAll = async () => Emprunt.find().sort({ createdAt: -1 });

exports.getById = async (id) => {
  const emprunt = await Emprunt.findById(id);
  if (!emprunt) throw Object.assign(new Error("Emprunt introuvable"), { statusCode: 404 });
  return emprunt;
};

exports.create = async (body, userId = null) => {
  const { lenderName, label, totalAmount, startDate, notes } = body;
  if (!lenderName || !String(lenderName).trim())
    throw Object.assign(new Error("Le prêteur (source) est obligatoire"), { statusCode: 400 });
  const total = roundAmount(totalAmount);
  if (!(total > 0))
    throw Object.assign(new Error("Le montant total doit être supérieur à 0"), { statusCode: 400 });

  return Emprunt.create({
    empruntNo: await generateEmpruntNo(),
    lenderName: String(lenderName).trim(),
    label: String(label || "").trim(),
    totalAmount: total,
    amountPaid: 0,
    status: "OPEN",
    startDate: startDate ? new Date(startDate) : new Date(),
    payments: [],
    notes: String(notes || "").trim(),
    createdBy: userId,
  });
};

exports.addPayment = async (id, body, userId = null) => {
  const emprunt = await exports.getById(id);
  if (emprunt.status === "SETTLED")
    throw Object.assign(new Error("Cet emprunt est déjà soldé"), { statusCode: 400 });

  const amount = roundAmount(body.amount);
  if (!(amount > 0))
    throw Object.assign(new Error("Le montant du règlement doit être supérieur à 0"), { statusCode: 400 });

  const remaining = roundAmount(Number(emprunt.totalAmount) - Number(emprunt.amountPaid));
  if (amount > remaining + 0.001)
    throw Object.assign(
      new Error(`Le règlement (${amount}) dépasse le restant dû (${remaining})`),
      { statusCode: 400 }
    );

  emprunt.payments.push({
    amount,
    method: body.method || "VIREMENT",
    paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    notes: String(body.notes || "").trim(),
    createdBy: userId,
  });
  recompute(emprunt);
  await emprunt.save();
  return emprunt;
};

exports.deletePayment = async (id, paymentId) => {
  const emprunt = await exports.getById(id);
  const payment = emprunt.payments.id(paymentId);
  if (!payment) throw Object.assign(new Error("Règlement introuvable"), { statusCode: 404 });
  payment.deleteOne();
  recompute(emprunt);
  await emprunt.save();
  return emprunt;
};

exports.remove = async (id) => {
  const emprunt = await Emprunt.findById(id);
  if (!emprunt) throw Object.assign(new Error("Emprunt introuvable"), { statusCode: 404 });
  await emprunt.deleteOne();
};