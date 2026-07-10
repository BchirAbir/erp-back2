const FinanceEntry = require("../models/finance-entry.model");
const ManualJournalEntry = require("../models/manual-journal-entry.model");
const CompanySettings = require("../models/company-settings.model");
const PurchaseInvoice = require("../../purchase/models/purchase-invoice.model");
const PurchasePayment = require("../../purchase/models/purchase-payment.model");
const CustomerInvoice = require("../../commercial/models/customer-invoice.model");
const Notification = require("../../../models/Notification");
const User = require("../../../models/User");

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

async function upsertEntry(sourceType, sourceId, payload) {
  return FinanceEntry.findOneAndUpdate(
    { sourceType, sourceId: String(sourceId) },
    {
      $setOnInsert: {
        ...payload,
        sourceType,
        sourceId: String(sourceId),
      },
    },
    { returnDocument: "after", upsert: true }
  );
}

function paymentAccountForMethod(method = "") {
  if (method === "ESPECE") return { code: "531", label: "Caisse" };
  return { code: "512", label: "Banque" };
}

function getAccountingLines(entry) {
  const amount = roundAmount(Number(entry.amount || 0));
  const method = entry.metadata?.method || entry.metadata?.paymentMethod || "";
  const cashAccount = paymentAccountForMethod(method);
  const htAmount = roundAmount(Number(entry.metadata?.subtotalHt ?? amount));

  const hasSeparatedTax = entry.metadata?.totalVat != null;
  const tvaAmount = hasSeparatedTax ? roundAmount(Number(entry.metadata.totalVat || 0)) : 0;
  const fodecAmount = hasSeparatedTax ? roundAmount(Number(entry.metadata.totalFodec || 0)) : 0;
  const timbreAmount = hasSeparatedTax ? roundAmount(Number(entry.metadata.timbreFiscal || 0)) : 0;
  const legacyTaxAmount = hasSeparatedTax ? 0 : roundAmount(Math.max(0, amount - htAmount));

  switch (entry.entryType) {
    case "INVOICE_ISSUED": {
      const lines = [
        { accountCode: "411", accountName: "Clients", side: "DEBIT", amount },
        { accountCode: "706", accountName: "Ventes de marchandises", side: "CREDIT", amount: htAmount },
      ];
      if (hasSeparatedTax) {
        if (tvaAmount > 0) lines.push({ accountCode: "4457", accountName: "TVA collectée", side: "CREDIT", amount: tvaAmount });
        if (fodecAmount > 0) lines.push({ accountCode: "44581", accountName: "FODEC collecté", side: "CREDIT", amount: fodecAmount });
        if (timbreAmount > 0) lines.push({ accountCode: "4371", accountName: "Timbre fiscal à décaisser", side: "CREDIT", amount: timbreAmount });
      } else if (legacyTaxAmount > 0) {
        lines.push({ accountCode: "4457", accountName: "TVA collectée", side: "CREDIT", amount: legacyTaxAmount });
      }
      return lines;
    }
    case "REGLEMENT_RECU":
      return [
        { accountCode: cashAccount.code, accountName: cashAccount.label, side: "DEBIT", amount },
        { accountCode: "411", accountName: "Clients", side: "CREDIT", amount },
      ];
    case "PAYABLE_RECORDED": {
      const lines = [
        { accountCode: "607", accountName: "Achats de marchandises", side: "DEBIT", amount: htAmount },
      ];
      if (hasSeparatedTax) {
        if (tvaAmount > 0) lines.push({ accountCode: "4456", accountName: "TVA déductible", side: "DEBIT", amount: tvaAmount });
        // FODEC on purchases is NOT recoverable in Tunisia — it is a cost (charge), not a tax credit
        if (fodecAmount > 0) lines.push({ accountCode: "60800", accountName: "FODEC sur achats", side: "DEBIT", amount: fodecAmount });
        if (timbreAmount > 0) lines.push({ accountCode: "6371", accountName: "Timbre fiscal", side: "DEBIT", amount: timbreAmount });
      } else if (legacyTaxAmount > 0) {
        lines.push({ accountCode: "4456", accountName: "TVA déductible", side: "DEBIT", amount: legacyTaxAmount });
      }
      lines.push({ accountCode: "401", accountName: "Fournisseurs", side: "CREDIT", amount });
      return lines;
    }
    case "PAYABLE_PAYMENT": {
      const rsAmount = roundAmount(Number(entry.metadata?.rsAmount || 0));
      const cashOut = roundAmount(amount - rsAmount);
      const lines = [
        { accountCode: "401", accountName: "Fournisseurs", side: "DEBIT", amount },
        { accountCode: cashAccount.code, accountName: cashAccount.label, side: "CREDIT", amount: rsAmount > 0 ? cashOut : amount },
      ];
      if (rsAmount > 0) {
        lines.push({ accountCode: "4028", accountName: "Retenues à la source à décaisser", side: "CREDIT", amount: rsAmount });
      }
      return lines;
    }
    case "PAYABLE_CREDIT":
      return [
        { accountCode: "401", accountName: "Fournisseurs", side: "DEBIT", amount },
        { accountCode: "609", accountName: "Avoirs fournisseurs", side: "CREDIT", amount },
      ];
    case "FUEL_EXPENSE":
      return [
        { accountCode: "6162", accountName: "Carburants et lubrifiants", side: "DEBIT", amount },
        { accountCode: "531", accountName: "Caisse", side: "CREDIT", amount },
      ];
    default:
      return [];
  }
}

// Determine cash-flow direction for a manual journal entry:
// DR cash/bank (5xx) → INFLOW; CR cash/bank → OUTFLOW; otherwise NONE
function inferManualDirection(lines = []) {
  for (const l of lines) {
    const code = String(l.accountCode || "");
    if (code.startsWith("5")) {
      return l.side === "DEBIT" ? "INFLOW" : "OUTFLOW";
    }
  }
  return "NONE";
}

function toJournalEntry(entry) {
  return {
    _id: String(entry._id),
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    reference: entry.reference,
    entryType: entry.entryType,
    sourceModule: entry.sourceModule,
    counterpartyName: entry.counterpartyName,
    direction: entry.direction || "NONE",
    occurredAt: entry.occurredAt,
    notes: entry.notes,
    currency: entry.currency,
    lines: getAccountingLines(entry),
  };
}

function toManualJournalEntry(entry) {
  const mappedLines = (entry.lines || []).map((l) => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    side: l.side,
    amount: roundAmount(Number(l.amount || 0)),
  }));
  return {
    _id: String(entry._id),
    sourceType: "MANUAL",
    sourceId: String(entry._id),
    reference: entry.reference,
    entryType: "MANUAL_ENTRY",
    sourceModule: "FINANCE",
    counterpartyName: "",
    direction: inferManualDirection(mappedLines),
    occurredAt: entry.occurredAt,
    notes: entry.description || "",
    currency: "TND",
    lines: mappedLines,
  };
}

function buildAccountSummaries(journalEntries = []) {
  const accountMap = new Map();

  for (const entry of journalEntries) {
    for (const line of entry.lines) {
      const current = accountMap.get(line.accountCode) || {
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: 0,
        credit: 0,
        balance: 0,
        inflow: 0,
        outflow: 0,
        netFlow: 0,
        entries: [],
      };

      if (line.side === "DEBIT") {
        current.debit = roundAmount(current.debit + line.amount);
        current.balance = roundAmount(current.balance + line.amount);
      } else {
        current.credit = roundAmount(current.credit + line.amount);
        current.balance = roundAmount(current.balance - line.amount);
      }

      // Cash-flow direction accumulation
      const direction = entry.direction || "NONE";
      if (direction === "INFLOW") {
        current.inflow = roundAmount(current.inflow + line.amount);
        current.netFlow = roundAmount(current.netFlow + line.amount);
      } else if (direction === "OUTFLOW") {
        current.outflow = roundAmount(current.outflow + line.amount);
        current.netFlow = roundAmount(current.netFlow - line.amount);
      }

      current.entries.push({
        journalEntryId: entry._id,
        reference: entry.reference,
        entryType: entry.entryType,
        occurredAt: entry.occurredAt,
        side: line.side,
        amount: line.amount,
        direction,
        counterpartyName: entry.counterpartyName,
      });
      accountMap.set(line.accountCode, current);
    }
  }

  return Array.from(accountMap.values()).sort((a, b) =>
    a.accountCode.localeCompare(b.accountCode)
  );
}

// ─── Recording Functions ──────────────────────────────────────────────────────

exports.recordInvoiceIssued = async (invoice) => {
  const totalTtc = roundAmount(Number(invoice.totalTtc || 0));
  const subtotalHt = roundAmount(Number(invoice.subtotalHt || 0));
  const totalVat = roundAmount(Number(invoice.totalVat || 0));
  const totalFodec = roundAmount(Number(invoice.totalFodec || 0));
  const timbreFiscal = roundAmount(Number(invoice.timbreFiscal || 0));

  // $set for amount/metadata so re-finalization always reflects current invoice totals.
  // $setOnInsert only for immutable identity fields.
  return FinanceEntry.findOneAndUpdate(
    { sourceType: "CUSTOMER_INVOICE_FINALIZED", sourceId: String(invoice._id) },
    {
      $setOnInsert: {
        entryType: "INVOICE_ISSUED",
        direction: "INFLOW",
        sourceModule: "COMMERCIAL",
        counterpartyType: "CUSTOMER",
        counterpartyId: String(invoice.customerId || ""),
        counterpartyName: invoice.customerName || "",
        currency: "TND",
        status: "OPEN",
        sourceType: "CUSTOMER_INVOICE_FINALIZED",
        sourceId: String(invoice._id),
      },
      $set: {
        reference: invoice.invoiceNo,
        amount: totalTtc,
        occurredAt: invoice.finalizedAt || invoice.issueDate || new Date(),
        notes: `Facture ${invoice.invoiceNo} émise`,
        metadata: {
          subtotalHt,
          totalVat,
          totalFodec,
          timbreFiscal,
          salesOrderId: String(invoice.salesOrderId || ""),
        },
      },
    },
    { returnDocument: "after", upsert: true }
  );
};

exports.recordReglement = async ({ invoice, payment }) => {
  if (!payment || payment.status !== "CLEARED") return null;

  await upsertEntry("CUSTOMER_REGLEMENT", payment._id, {
    entryType: "REGLEMENT_RECU",
    direction: "INFLOW",
    sourceModule: "COMMERCIAL",
    reference: payment.reference || invoice.invoiceNo,
    counterpartyType: "CUSTOMER",
    counterpartyId: String(invoice.customerId || ""),
    counterpartyName: invoice.customerName || "",
    amount: roundAmount(payment.amount),
    status: "SETTLED",
    occurredAt: payment.paidAt || new Date(),
    notes: `Règlement reçu pour ${invoice.invoiceNo}`,
    metadata: {
      customerInvoiceId: String(invoice._id),
      invoiceNo: invoice.invoiceNo,
      method: payment.method,
    },
  });

  const invoiceEntry = await FinanceEntry.findOne({
    sourceType: "CUSTOMER_INVOICE_FINALIZED",
    sourceId: String(invoice._id),
  });
  if (invoiceEntry) {
    const remaining = roundAmount(
      Number(invoice.totalTtc || 0) - Number(invoice.amountPaid || 0)
    );
    // Keep amount = original totalTtc so journal lines stay balanced (DR 411 = CR 706 + taxes).
    // Only track payment state via status.
    invoiceEntry.status = remaining <= 0 ? "SETTLED" : "OPEN";
    await invoiceEntry.save();
  }
};

exports.recordPurchaseInvoiceApproved = async (invoice) => {
  const totalTtc = roundAmount(Number(invoice.totalTtc || 0));
  const subtotalHt = roundAmount(Number(invoice.subtotalHt || 0));
  const totalVat = roundAmount(Number(invoice.totalVat || 0));
  const totalFodec = roundAmount(Number(invoice.totalFodec || 0));
  const timbreFiscal = roundAmount(Number(invoice.timbreFiscal || 0));
  const creditNoteAmount = roundAmount(Number(invoice.creditNoteAmount || 0));
  // Use totalTtc (not outstanding) so DR 607+taxes = CR 401 = totalTtc — balanced.
  // Credit notes are recorded separately via PAYABLE_CREDIT entries.
  const outstanding = roundAmount(Math.max(0, totalTtc - creditNoteAmount));

  const entry = await FinanceEntry.findOneAndUpdate(
    { sourceType: "PURCHASE_INVOICE_APPROVED", sourceId: String(invoice._id) },
    {
      $setOnInsert: {
        entryType: "PAYABLE_RECORDED",
        direction: "OUTFLOW",
        sourceModule: "PURCHASE",
        counterpartyType: "SUPPLIER",
        counterpartyId: String(invoice.supplierId),
        currency: "TND",
        sourceType: "PURCHASE_INVOICE_APPROVED",
        sourceId: String(invoice._id),
      },
      $set: {
        reference: invoice.invoiceNo,
        amount: totalTtc,
        status: outstanding > 0 ? "OPEN" : "SETTLED",
        occurredAt: invoice.approvedAt || new Date(),
        notes: `Facture fournisseur ${invoice.invoiceNo} approuvée`,
        metadata: {
          subtotalHt,
          totalVat,
          totalFodec,
          timbreFiscal,
          purchaseOrderId: String(invoice.purchaseOrderId),
          totalTtc,
          creditNoteAmount,
        },
      },
    },
    { returnDocument: "after", upsert: true }
  );

  // Notify finance that a supplier invoice is pending payment
  if (outstanding > 0) {
    Notification.create({
      module: "FINANCE",
      eventType: "PAYABLE_PENDING",
      title: `Facture fournisseur à régler : ${invoice.invoiceNo}`,
      message: `Une facture fournisseur de ${totalTtc.toFixed(3)} TND est approuvée et en attente de règlement.`,
      metadata: {
        invoiceNo: invoice.invoiceNo,
        invoiceId: String(invoice._id),
        supplierId: String(invoice.supplierId),
        amount: totalTtc,
        dueDate: invoice.dueDate || null,
      },
    }).catch(() => {});
  }

  return entry;
};

exports.recordPurchasePayment = async ({ payment, invoice }) => {
  const rsAmount = roundAmount(Number(payment.rsAmount || 0));

  await upsertEntry("PURCHASE_PAYMENT_CREATED", payment._id, {
    entryType: "PAYABLE_PAYMENT",
    direction: "OUTFLOW",
    sourceModule: "PURCHASE",
    reference: payment.paymentNo,
    counterpartyType: "SUPPLIER",
    counterpartyId: String(payment.supplierId),
    amount: roundAmount(payment.amount),
    status: "SETTLED",
    occurredAt: payment.paymentDate || new Date(),
    notes: `Paiement fournisseur ${payment.paymentNo}`,
    metadata: {
      purchaseInvoiceId: String(payment.purchaseInvoiceId),
      method: payment.method,
      invoiceNo: invoice?.invoiceNo || "",
      rsAmount,
      rsRate: Number(payment.rsRate || 0),
      rsType: payment.rsType || "",
    },
  });

  const payableEntry = await FinanceEntry.findOne({
    sourceType: "PURCHASE_INVOICE_APPROVED",
    sourceId: String(payment.purchaseInvoiceId),
  });
  if (payableEntry) {
    const remaining = roundAmount(
      Number(invoice.totalTtc || 0) -
        Number(invoice.creditNoteAmount || 0) -
        Number(invoice.amountPaid || 0)
    );
    // Keep amount = original outstanding so journal lines stay balanced (DR 607/taxes = CR 401).
    payableEntry.status = remaining > 0 ? "OPEN" : "SETTLED";
    await payableEntry.save();
  }
};

exports.recordPurchaseReturnCredit = async ({ purchaseReturn, invoice }) => {
  if (Number(purchaseReturn.refundAmount || 0) <= 0) return null;

  await upsertEntry("PURCHASE_RETURN_CREDIT", purchaseReturn._id, {
    entryType: "PAYABLE_CREDIT",
    direction: "NONE",
    sourceModule: "PURCHASE",
    reference: purchaseReturn.returnNo,
    counterpartyType: "SUPPLIER",
    counterpartyId: String(purchaseReturn.supplierId),
    amount: roundAmount(purchaseReturn.refundAmount),
    status: "INFO",
    occurredAt: purchaseReturn.createdAt || new Date(),
    notes: `Avoir fournisseur ${purchaseReturn.returnNo}`,
    metadata: {
      purchaseInvoiceId: String(purchaseReturn.purchaseInvoiceId),
      invoiceNo: invoice?.invoiceNo || "",
      reason: purchaseReturn.reason,
    },
  });

  const payableEntry = await FinanceEntry.findOne({
    sourceType: "PURCHASE_INVOICE_APPROVED",
    sourceId: String(purchaseReturn.purchaseInvoiceId),
  });
  if (payableEntry) {
    const remaining = roundAmount(
      Number(invoice.totalTtc || 0) -
        Number(invoice.creditNoteAmount || 0) -
        Number(invoice.amountPaid || 0)
    );
    // Keep original amount intact for balanced journal entries; only update status.
    payableEntry.status = remaining > 0 ? "OPEN" : "SETTLED";
    await payableEntry.save();
  }
};

// ─── Fuel expense (triggered on delivery plan completion) ─────────────────────

exports.recordFuelExpense = async (plan, pricePerLiter, fuelTypeName = "") => {
  const liters = Number(plan.fuelAddedLiters || 0);
  const price  = Number(pricePerLiter || 0);
  if (liters <= 0 || price <= 0) return null;

  const amount = roundAmount(liters * price);

  await upsertEntry("DELIVERY_FUEL", plan._id, {
    entryType:        "FUEL_EXPENSE",
    direction:        "OUTFLOW",
    sourceModule:     "COMMERCIAL",
    reference:        plan.planNo || "",
    counterpartyType: "INTERNAL",
    counterpartyName: fuelTypeName ? `Carburant (${fuelTypeName})` : "Carburant livraison",
    amount,
    status:           "SETTLED",
    occurredAt:       plan.completedAt || new Date(),
    notes:            `${liters} L × ${price} TND/L — Plan ${plan.planNo}`,
    metadata:         { liters, pricePerLiter: price, fuelType: fuelTypeName, planNo: plan.planNo },
  });

  return amount;
};

// ─── Resync ───────────────────────────────────────────────────────────────────

exports.resyncFinanceEntries = async () => {
  const clientInvoices = await CustomerInvoice.find(CLIENT_INVOICE_FILTER);
  for (const invoice of clientInvoices) {
    await exports.recordInvoiceIssued(invoice);
  }

  const purchaseInvoices = await PurchaseInvoice.find({ approvedAt: { $exists: true, $ne: null } });
  for (const invoice of purchaseInvoices) {
    await exports.recordPurchaseInvoiceApproved(invoice);
  }

  return {
    totalClientInvoices: clientInvoices.length,
    totalPurchaseInvoices: purchaseInvoices.length,
  };
};

// ─── TEJ ──────────────────────────────────────────────────────────────────────

exports.updateInvoiceTej = async (invoiceId, payload) => {
  const invoice = await CustomerInvoice.findById(invoiceId);
  if (!invoice) throw Object.assign(new Error("Facture introuvable"), { statusCode: 404 });
  if (!invoice.finalizedAt)
    throw Object.assign(new Error("Seules les factures finalisées acceptent une référence TEJ"), { statusCode: 400 });

  const { tejReference, tejStatus, tejQrData } = payload;
  if (tejReference !== undefined) invoice.tejReference = String(tejReference).trim();
  if (tejStatus !== undefined) invoice.tejStatus = tejStatus;
  if (tejQrData !== undefined) invoice.tejQrData = String(tejQrData).trim();

  await invoice.save();
  return invoice;
};

// ─── Manual Journal Entries ───────────────────────────────────────────────────

exports.createManualEntry = async (body, userId) => {
  const { reference, description, occurredAt, lines } = body;
  if (!reference) throw Object.assign(new Error("Référence obligatoire"), { statusCode: 400 });
  if (!lines || lines.length < 2)
    throw Object.assign(new Error("Au moins 2 lignes sont requises"), { statusCode: 400 });

  const totalDebit = roundAmount(
    lines.filter((l) => l.side === "DEBIT").reduce((sum, l) => sum + Number(l.amount || 0), 0)
  );
  const totalCredit = roundAmount(
    lines.filter((l) => l.side === "CREDIT").reduce((sum, l) => sum + Number(l.amount || 0), 0)
  );

  if (Math.abs(totalDebit - totalCredit) > 0.001)
    throw Object.assign(new Error(`Débit (${totalDebit}) ≠ Crédit (${totalCredit})`), { statusCode: 400 });

  const entry = new ManualJournalEntry({
    reference: String(reference).trim().toUpperCase(),
    description: String(description || "").trim(),
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    lines: lines.map((l) => ({
      accountCode: String(l.accountCode).trim(),
      accountName: String(l.accountName).trim(),
      side: l.side,
      amount: roundAmount(Number(l.amount)),
    })),
    createdBy: userId || null,
  });

  await entry.save();
  return entry;
};

exports.getManualEntries = async () =>
  ManualJournalEntry.find().sort({ occurredAt: -1, createdAt: -1 }).limit(500);

exports.deleteManualEntry = async (id) => {
  const entry = await ManualJournalEntry.findById(id);
  if (!entry) throw Object.assign(new Error("Écriture introuvable"), { statusCode: 404 });
  await entry.deleteOne();
};

// ─── RS ───────────────────────────────────────────────────────────────────────

exports.getRsPayments = async () => {
  const payments = await PurchasePayment.find({ rsAmount: { $gt: 0 } })
    .populate("supplierId", "supplierNo name")
    .populate("purchaseInvoiceId", "invoiceNo")
    .sort({ paymentDate: -1 });

  const totalRs = roundAmount(payments.reduce((sum, p) => sum + Number(p.rsAmount || 0), 0));

  return {
    payments: payments.map((p) => ({
      _id: String(p._id),
      paymentNo: p.paymentNo,
      supplierName: p.supplierId?.name || "Fournisseur inconnu",
      supplierNo: p.supplierId?.supplierNo || "",
      invoiceNo: p.purchaseInvoiceId?.invoiceNo || "",
      amount: roundAmount(p.amount),
      rsRate: p.rsRate || 0,
      rsAmount: roundAmount(p.rsAmount || 0),
      rsType: p.rsType || "",
      method: p.method,
      paymentDate: p.paymentDate,
    })),
    totalRs,
  };
};

// ─── Query Functions ──────────────────────────────────────────────────────────

const CLIENT_INVOICE_FILTER = {
  $and: [
    { $or: [{ finalizedAt: { $ne: null } }, { amountPaid: { $gt: 0 } }] },
    { $or: [{ invoiceType: "CLIENT" }, { invoiceType: { $exists: false } }] },
  ],
};

exports.getDashboard = async (year) => {
  const clientInvoiceFilter = CLIENT_INVOICE_FILTER;

  // Resolve year window — current year by default
  const targetYear = Number(year) || new Date().getFullYear();
  const yearStart  = new Date(targetYear, 0, 1, 0, 0, 0, 0);
  const yearEnd    = new Date(targetYear + 1, 0, 1, 0, 0, 0, 0);

  // Pick the most reliable date field per doc (invoiceDate/issueDate, falls back to createdAt)
  const inYear = (doc, field) => {
    const d = doc[field] || doc.createdAt;
    if (!d) return false;
    const ts = new Date(d).getTime();
    return ts >= yearStart.getTime() && ts < yearEnd.getTime();
  };

  const [purchaseInvoicesAll, purchasePaymentsAll, customerInvoicesAll, entries] = await Promise.all([
    PurchaseInvoice.find().populate("supplierId", "supplierNo name"),
    PurchasePayment.find().populate("supplierId", "supplierNo name"),
    CustomerInvoice.find(clientInvoiceFilter).sort({ createdAt: -1 }),
    FinanceEntry.find({ occurredAt: { $gte: yearStart, $lt: yearEnd } })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(8),
  ]);

  // Year-scope filter
  const purchaseInvoices = purchaseInvoicesAll.filter((inv) => inYear(inv, "invoiceDate"));
  const purchasePayments = purchasePaymentsAll.filter((p)   => inYear(p,   "paymentDate"));
  const customerInvoices = customerInvoicesAll.filter((inv) => inYear(inv, "issueDate"));

  const payableInvoices = purchaseInvoices.filter((inv) =>
    ["APPROVED", "PARTIALLY_PAID", "PAID"].includes(inv.status)
  );

  const totalPayablesOutstanding = roundAmount(
    payableInvoices.reduce(
      (sum, inv) =>
        sum +
        Math.max(
          0,
          Number(inv.totalTtc || 0) -
            Number(inv.creditNoteAmount || 0) -
            Number(inv.amountPaid || 0)
        ),
      0
    )
  );
  // Actual cash out = gross payment minus withholding tax retained (RS goes to account 4028, not to supplier)
  const totalPaidOut = roundAmount(
    purchasePayments.reduce(
      (sum, p) => sum + Math.max(0, Number(p.amount || 0) - Number(p.rsAmount || 0)),
      0
    )
  );
  const totalReceivables = roundAmount(
    customerInvoices.reduce(
      (sum, inv) => sum + Math.max(0, Number(inv.totalTtc || 0) - Number(inv.amountPaid || 0)),
      0
    )
  );
  const recognizedRevenue = roundAmount(
    customerInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc || 0), 0)
  );
  // Total cash actually received from clients (sum of all amountPaid on invoices)
  const totalCollected = roundAmount(
    customerInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0)
  );
  const overduePayables = payableInvoices.filter((inv) => {
    const outstanding =
      Number(inv.totalTtc || 0) -
      Number(inv.creditNoteAmount || 0) -
      Number(inv.amountPaid || 0);
    return outstanding > 0 && inv.dueDate && new Date(inv.dueDate) < new Date();
  }).length;

  // Total monthly salary commitment (active + on-leave employees)
  const salaryAgg = await User.aggregate([
    { $match: { status: { $in: ["Active", "On Leave"] }, salary: { $gt: 0 } } },
    { $group: { _id: null, totalSalary: { $sum: "$salary" }, employeeCount: { $sum: 1 } } },
  ]);
  const totalSalary = roundAmount(salaryAgg[0]?.totalSalary || 0);
  const salariedEmployees = salaryAgg[0]?.employeeCount || 0;

  return {
    year: targetYear,
    totals: {
      totalPayablesOutstanding,
      totalPaidOut,
      totalReceivables,
      totalCollected,
      recognizedRevenue,
      netExpectedCash: roundAmount(totalReceivables - totalPayablesOutstanding),
      overduePayables,
      totalSalary,
      salariedEmployees,
    },
    recentEntries: entries,
  };
};

exports.getReceivables = async () => {
  const invoices = await CustomerInvoice.find(CLIENT_INVOICE_FILTER)
    .populate("salesOrderId", "orderNo status shippedAt deliveredAt closedAt promisedDate trackingNumber")
    .sort({ issueDate: -1, createdAt: -1 });

  return invoices.map((invoice) => ({
    _id: String(invoice._id),
    orderNo: invoice.salesOrderId?.orderNo || invoice.invoiceNo,
    customerId: invoice.customerId ? String(invoice.customerId) : "",
    customerName: invoice.customerName,
    status: invoice.salesOrderId?.status || "INVOICED",
    amount: roundAmount(
      Math.max(0, Number(invoice.totalTtc || 0) - Number(invoice.amountPaid || 0))
    ),
    totalTtc: roundAmount(Number(invoice.totalTtc || 0)),
    amountPaid: roundAmount(Number(invoice.amountPaid || 0)),
    promisedDate: invoice.salesOrderId?.promisedDate || invoice.dueDate || null,
    shippedAt: invoice.salesOrderId?.shippedAt || null,
    deliveredAt: invoice.salesOrderId?.deliveredAt || null,
    closedAt: invoice.salesOrderId?.closedAt || null,
    trackingNumber: invoice.salesOrderId?.trackingNumber || "",
    invoiceNo: invoice.invoiceNo,
    paymentStatus: invoice.paymentStatus,
    paymentMethod: invoice.paymentMethod,
    dueDate: invoice.dueDate || null,
    finalizedAt: invoice.finalizedAt || null,
  }));
};

exports.getPayables = async () => {
  const invoices = await PurchaseInvoice.find()
    .populate("supplierId", "supplierNo name")
    .sort({ dueDate: 1, createdAt: -1 });

  return invoices
    .filter((inv) => ["APPROVED", "PARTIALLY_PAID", "PAID"].includes(inv.status))
    .map((inv) => {
      const outstanding = roundAmount(
        Math.max(
          0,
          Number(inv.totalTtc || 0) -
            Number(inv.creditNoteAmount || 0) -
            Number(inv.amountPaid || 0)
        )
      );
      return {
        _id: String(inv._id),
        invoiceNo: inv.invoiceNo,
        supplierId: inv.supplierId?._id
          ? String(inv.supplierId._id)
          : String(inv.supplierId || ""),
        supplierNo: inv.supplierId?.supplierNo || "",
        supplierName: inv.supplierId?.name || "Fournisseur inconnu",
        status: inv.status,
        totalTtc: roundAmount(inv.totalTtc),
        amountPaid: roundAmount(inv.amountPaid || 0),
        creditNoteAmount: roundAmount(inv.creditNoteAmount || 0),
        outstanding,
        dueDate: inv.dueDate,
        invoiceDate: inv.invoiceDate,
        matchingStatus: inv.matchingStatus,
        isOverdue:
          outstanding > 0 && inv.dueDate && new Date(inv.dueDate) < new Date(),
      };
    });
};

exports.getTreasury = async () => {
  const [payments, payables, receivables, entries] = await Promise.all([
    PurchasePayment.find()
      .sort({ paymentDate: -1 })
      .populate("supplierId", "supplierNo name"),
    exports.getPayables(),
    exports.getReceivables(),
    FinanceEntry.find().sort({ occurredAt: -1, createdAt: -1 }).limit(20),
  ]);

  const supplierPayments = payments.map((p) => ({
    _id: String(p._id),
    reference: p.paymentNo,
    direction: "OUTFLOW",
    // Net cash = gross amount minus withholding tax retained (RS)
    amount: roundAmount(Math.max(0, Number(p.amount || 0) - Number(p.rsAmount || 0))),
    method: p.method,
    date: p.paymentDate,
    counterparty: p.supplierId?.name || "Fournisseur inconnu",
  }));

  const expectedCustomerInflows = receivables.map((item) => ({
    _id: item._id,
    reference: item.invoiceNo,
    direction: "INFLOW",
    amount: item.amount,
    method: "EXPECTED",
    date: item.deliveredAt || item.shippedAt || item.promisedDate || null,
    counterparty: item.customerName,
  }));

  return {
    summary: {
      actualOutflows: roundAmount(
        supplierPayments.reduce((sum, item) => sum + item.amount, 0)
      ),
      expectedInflows: roundAmount(
        expectedCustomerInflows.reduce((sum, item) => sum + item.amount, 0)
      ),
      openPayables: roundAmount(payables.reduce((sum, item) => sum + item.outstanding, 0)),
      openReceivables: roundAmount(receivables.reduce((sum, item) => sum + item.amount, 0)),
      next30DaysSupplierDue: roundAmount(
        payables
          .filter((item) => {
            if (!item.dueDate || item.outstanding <= 0) return false;
            const due = new Date(item.dueDate).getTime();
            const now = Date.now();
            return due >= now && due <= now + 30 * 24 * 60 * 60 * 1000;
          })
          .reduce((sum, item) => sum + item.outstanding, 0)
      ),
    },
    cashMovements: [...supplierPayments, ...expectedCustomerInflows]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 20),
    recentEntries: entries,
  };
};

exports.getEntries = async () =>
  FinanceEntry.find().sort({ occurredAt: -1, createdAt: -1 }).limit(100);

exports.getJournal = async () => {
  const [autoEntries, manualEntries] = await Promise.all([
    FinanceEntry.find().sort({ occurredAt: -1, createdAt: -1 }).limit(500),
    ManualJournalEntry.find().sort({ occurredAt: -1, createdAt: -1 }).limit(500),
  ]);
  return [
    ...autoEntries.map(toJournalEntry),
    ...manualEntries.map(toManualJournalEntry),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
};

exports.getAccounts = async ({ year, month } = {}) => {
  // Build date range filter (year + optional month)
  const dateFilter = {};
  if (year) {
    const y = Number(year);
    if (month) {
      const m = Number(month) - 1;
      dateFilter.occurredAt = {
        $gte: new Date(y, m, 1, 0, 0, 0, 0),
        $lt:  new Date(y, m + 1, 1, 0, 0, 0, 0),
      };
    } else {
      dateFilter.occurredAt = {
        $gte: new Date(y, 0, 1, 0, 0, 0, 0),
        $lt:  new Date(y + 1, 0, 1, 0, 0, 0, 0),
      };
    }
  }

  // Fetch ALL entries (no limit) for accurate account balances used in reports.
  // getJournal() has a display limit of 500 — do not use it here.
  const [autoEntries, manualEntries] = await Promise.all([
    FinanceEntry.find(dateFilter).sort({ occurredAt: 1, createdAt: 1 }),
    ManualJournalEntry.find(dateFilter).sort({ occurredAt: 1, createdAt: 1 }),
  ]);
  const all = [
    ...autoEntries.map(toJournalEntry),
    ...manualEntries.map(toManualJournalEntry),
  ];
  const accounts = buildAccountSummaries(all);

  // Global cash-flow totals across all entries (entry-level, not line-level — avoids double counting)
  let totalInflow = 0, totalOutflow = 0;
  for (const e of all) {
    if (e.direction === "INFLOW" || e.direction === "OUTFLOW") {
      // amount = sum of debit side of the entry (= sum of credit side, they balance)
      const entryAmount = e.lines
        .filter((l) => l.side === "DEBIT")
        .reduce((sum, l) => sum + Number(l.amount || 0), 0);
      if (e.direction === "INFLOW")  totalInflow  = roundAmount(totalInflow  + entryAmount);
      else                            totalOutflow = roundAmount(totalOutflow + entryAmount);
    }
  }
  const globalTotals = {
    inflow:  roundAmount(totalInflow),
    outflow: roundAmount(totalOutflow),
    netFlow: roundAmount(totalInflow - totalOutflow),
  };

  return { accounts, totals: globalTotals };
};

exports.getAccountLedger = async (accountCode) => {
  const { accounts } = await exports.getAccounts();
  const account = accounts.find((item) => item.accountCode === accountCode);
  if (!account) throw Object.assign(new Error("Compte introuvable"), { statusCode: 404 });
  return account;
};

exports.getReports = async () => {
  const { accounts } = await exports.getAccounts();
  const getBalance = (code) =>
    accounts.find((item) => item.accountCode === code)?.balance || 0;

  const balanceSheet = {
    assets: {
      receivables: roundAmount(Math.max(0, getBalance("411"))),
      cash: roundAmount(Math.max(0, getBalance("531"))),
      bank: roundAmount(Math.max(0, getBalance("512"))),
    },
    liabilities: {
      supplierPayables: roundAmount(Math.max(0, Math.abs(getBalance("401")))),
      tvaCollectee: roundAmount(Math.max(0, Math.abs(getBalance("4457")))),
      fodecCollecte: roundAmount(Math.max(0, Math.abs(getBalance("44581")))),
      timbreADecaisser: roundAmount(Math.max(0, Math.abs(getBalance("4371")))),
      rsADecaisser: roundAmount(Math.max(0, Math.abs(getBalance("4028")))),
    },
  };
  balanceSheet.assets.total = roundAmount(
    balanceSheet.assets.receivables + balanceSheet.assets.cash + balanceSheet.assets.bank
  );
  balanceSheet.liabilities.total = roundAmount(
    balanceSheet.liabilities.supplierPayables +
      balanceSheet.liabilities.tvaCollectee +
      balanceSheet.liabilities.fodecCollecte +
      balanceSheet.liabilities.timbreADecaisser +
      balanceSheet.liabilities.rsADecaisser
  );

  const profitAndLoss = {
    revenue: {
      salesRevenue: roundAmount(Math.abs(getBalance("706"))),
      purchaseCredits: roundAmount(Math.abs(getBalance("609"))),
    },
    expenses: {
      purchasesExpense: roundAmount(Math.max(0, getBalance("607"))),
      fodecAchats: roundAmount(Math.max(0, getBalance("60800"))),
      timbreFiscal: roundAmount(Math.max(0, getBalance("6371"))),
    },
    tax: {
      tvaCollectee: roundAmount(Math.abs(getBalance("4457"))),
      tvaDeductible: roundAmount(Math.max(0, getBalance("4456"))),
      tvaNet: roundAmount(
        Math.abs(getBalance("4457")) - Math.max(0, getBalance("4456"))
      ),
      fodecCollecte: roundAmount(Math.abs(getBalance("44581"))),
      timbreADecaisser: roundAmount(Math.abs(getBalance("4371"))),
      rsADecaisser: roundAmount(Math.abs(getBalance("4028"))),
    },
  };
  profitAndLoss.revenue.total = roundAmount(
    profitAndLoss.revenue.salesRevenue + profitAndLoss.revenue.purchaseCredits
  );
  profitAndLoss.expenses.total = roundAmount(
    profitAndLoss.expenses.purchasesExpense +
      profitAndLoss.expenses.fodecAchats +
      profitAndLoss.expenses.timbreFiscal
  );
  profitAndLoss.netResult = roundAmount(
    profitAndLoss.revenue.total - profitAndLoss.expenses.total
  );

  return { balanceSheet, profitAndLoss, accounts };
};

exports.getTvaDeclaration = async (year, month) => {
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 1);
  const dateFilter = { occurredAt: { $gte: start, $lt: end } };

  const [autoEntries, manualEntries] = await Promise.all([
    FinanceEntry.find(dateFilter),
    ManualJournalEntry.find(dateFilter),
  ]);

  const journalEntries = [
    ...autoEntries.map(toJournalEntry),
    ...manualEntries.map(toManualJournalEntry),
  ];

  const accounts = buildAccountSummaries(journalEntries);
  const getBalance = (code) => accounts.find((a) => a.accountCode === code)?.balance || 0;

  const tvaCollectee = roundAmount(Math.abs(getBalance("4457")));
  const tvaDeductible = roundAmount(Math.max(0, getBalance("4456")));

  return {
    period: { year: Number(year), month: Number(month) },
    tvaCollectee,
    tvaDeductible,
    tvaNet: roundAmount(tvaCollectee - tvaDeductible),
    fodecCollecte: roundAmount(Math.abs(getBalance("44581"))),
    timbreADecaisser: roundAmount(Math.abs(getBalance("4371"))),
    rsADecaisser: roundAmount(Math.abs(getBalance("4028"))),
    salesRevenue: roundAmount(Math.abs(getBalance("706"))),
    purchasesHt: roundAmount(Math.max(0, getBalance("607"))),
  };
};

// ─── Company Settings ─────────────────────────────────────────────────────────

// ─── Calendar ─────────────────────────────────────────────────────────────────

exports.getCalendar = async (year, month) => {
  const y = Number(year);
  const m = Number(month);
  // Use UTC boundaries so key generation stays consistent regardless of server timezone
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end   = new Date(Date.UTC(y, m,     1));

  const [entries, kumbilInvoices] = await Promise.all([
    FinanceEntry.find({
      occurredAt: { $gte: start, $lt: end },
      entryType: { $in: ["REGLEMENT_RECU", "PAYABLE_PAYMENT"] },
    }),
    CustomerInvoice.find({
      paymentMethod: "KUMBIL",
      "installments.dueDate": { $gte: start, $lt: end },
    }).select("installments").lean(),
  ]);

  const days = {};

  const ensureDay = (key) => {
    if (!days[key]) {
      days[key] = { inflows: 0, outflows: 0, net: 0, inflowCount: 0, outflowCount: 0, kumbilExpected: 0, kumbilCount: 0 };
    }
  };

  // Build a YYYY-MM-DD key from a Date using UTC methods
  const dateKey = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  for (const entry of entries) {
    const key = dateKey(new Date(entry.occurredAt));
    ensureDay(key);
    if (entry.entryType === "REGLEMENT_RECU") {
      days[key].inflows = roundAmount(days[key].inflows + Number(entry.amount || 0));
      days[key].inflowCount++;
    } else {
      days[key].outflows = roundAmount(days[key].outflows + Number(entry.amount || 0));
      days[key].outflowCount++;
    }
  }

  for (const invoice of kumbilInvoices) {
    for (const inst of (invoice.installments || [])) {
      if (!["PENDING", "PARTIAL", "LATE"].includes(inst.status)) continue;
      const d = new Date(inst.dueDate);
      if (d < start || d >= end) continue;
      const key = dateKey(d);
      ensureDay(key);
      const remaining = roundAmount(Number(inst.plannedAmount || 0) - Number(inst.paidAmount || 0));
      days[key].inflows = roundAmount(days[key].inflows + remaining);
      days[key].inflowCount++;
      days[key].kumbilExpected = roundAmount(days[key].kumbilExpected + remaining);
      days[key].kumbilCount++;
    }
  }

  for (const key of Object.keys(days)) {
    days[key].net = roundAmount(days[key].inflows - days[key].outflows);
  }

  return { year: y, month: m, days };
};

exports.getCompanySettings = async () => {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = await CompanySettings.create({
      companyName: "EMM TN",
      address: "Route de Gabès Km 6, Sfax, Tunisie",
      phone: "+(216) 98 241 790",
      email: "info@emmtn.com",
    });
  }
  return settings;
};

exports.updateCompanySettings = async (payload) => {
  let settings = await CompanySettings.findOne();
  if (!settings) settings = new CompanySettings();
  const fields = ["companyName", "mf", "rne", "address", "phone", "email", "rib", "iban", "bank", "agence"];
  for (const field of fields) {
    if (payload[field] !== undefined) settings[field] = String(payload[field]).trim();
  }
  if (payload.invoicePrefix !== undefined) {
    const cleaned = String(payload.invoicePrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    settings.invoicePrefix = cleaned || "FC";
  }
  if (payload.invoiceNextNumber !== undefined) {
    const n = Math.max(0, Math.floor(Number(payload.invoiceNextNumber) || 0));
    settings.invoiceNextNumber = n;
  }
  await settings.save();
  return settings;
};

exports.getSalesReport = async (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const invoices = await CustomerInvoice.find({
    $and: [
      ...CLIENT_INVOICE_FILTER.$and,
      { issueDate: { $gte: start, $lte: end } },
    ],
  }).sort({ issueDate: 1 });

  const totalCount = invoices.length;
  const totalHt = roundAmount(invoices.reduce((s, inv) => s + (inv.subtotalHt || 0), 0));
  const totalTtc = roundAmount(invoices.reduce((s, inv) => s + (inv.totalTtc || 0), 0));
  const paidInvoices = invoices.filter((inv) => inv.paymentStatus === "PAYEE");
  const totalPaid = roundAmount(paidInvoices.reduce((s, inv) => s + (inv.totalTtc || 0), 0));
  const totalUnpaid = roundAmount(totalTtc - totalPaid);

  const byMonthMap = {};
  for (const inv of invoices) {
    const d = new Date(inv.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonthMap[key]) byMonthMap[key] = { month: key, count: 0, totalHt: 0, totalTtc: 0 };
    byMonthMap[key].count++;
    byMonthMap[key].totalHt = roundAmount(byMonthMap[key].totalHt + (inv.subtotalHt || 0));
    byMonthMap[key].totalTtc = roundAmount(byMonthMap[key].totalTtc + (inv.totalTtc || 0));
  }

  const byCustomerMap = {};
  for (const inv of invoices) {
    const name = inv.customerName || "—";
    if (!byCustomerMap[name]) byCustomerMap[name] = { customerName: name, count: 0, totalTtc: 0 };
    byCustomerMap[name].count++;
    byCustomerMap[name].totalTtc = roundAmount(byCustomerMap[name].totalTtc + (inv.totalTtc || 0));
  }

  return {
    period: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
    summary: {
      totalCount,
      totalHt,
      totalTtc,
      totalPaid,
      totalUnpaid,
      paidCount: paidInvoices.length,
      unpaidCount: totalCount - paidInvoices.length,
    },
    byMonth: Object.values(byMonthMap).sort((a, b) => a.month.localeCompare(b.month)),
    topCustomers: Object.values(byCustomerMap)
      .sort((a, b) => b.totalTtc - a.totalTtc)
      .slice(0, 8),
  };
};

exports.getDepartmentExpenses = async () => {
  const rows = await User.aggregate([
    { $match: { department: { $ne: "None" }, status: { $ne: "Inactive" } } },
    {
      $group: {
        _id: "$department",
        employeeCount: { $sum: 1 },
        activeCount: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        onLeaveCount: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
        totalSalary: { $sum: "$salary" },
        avgSalary: { $avg: "$salary" },
      },
    },
    { $sort: { totalSalary: -1 } },
  ]);

  const departments = rows.map((r) => ({
    department: r._id,
    employeeCount: r.employeeCount,
    activeCount: r.activeCount,
    onLeaveCount: r.onLeaveCount,
    totalSalary: roundAmount(r.totalSalary),
    avgSalary: roundAmount(r.avgSalary || 0),
  }));

  const totalSalary = roundAmount(departments.reduce((s, d) => s + d.totalSalary, 0));
  const totalEmployees = departments.reduce((s, d) => s + d.employeeCount, 0);

  return { departments, totalSalary, totalEmployees };
};

exports.payPayable = async (invoiceId, { method, amount, paymentDate, notes = "", createdBy = null }) => {
  const invoice = await PurchaseInvoice.findById(invoiceId);
  if (!invoice) {
    throw Object.assign(new Error("Facture introuvable"), { statusCode: 404 });
  }
  if (!["APPROVED", "PARTIALLY_PAID"].includes(invoice.status)) {
    throw Object.assign(new Error("Seules les factures approuvées peuvent être payées"), { statusCode: 400 });
  }

  const purchasePaymentService = require("../../purchase/services/purchase-payment.service");
  return purchasePaymentService.createPurchasePayment({
    supplierId: invoice.supplierId.toString(),
    purchaseInvoiceId: invoiceId,
    method,
    amount,
    paymentDate,
    notes,
    createdBy,
  });
};
