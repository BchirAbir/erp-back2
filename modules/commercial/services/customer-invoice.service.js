const CustomerInvoice = require("../models/customer-invoice.model");
const financeService = require("../../finance/services/finance.service");
const purchaseSettingService = require("../../purchase/services/purchase-setting.service");

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function generateInvoiceNo() {
  // Configurable prefix (Finance settings), defaults to "FC"
  const settings = await financeService.getCompanySettings();
  const prefix = (settings?.invoicePrefix || "FC").toUpperCase().replace(/[^A-Z0-9]/g, "") || "FC";
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-(\\d+)`);
  // Match both legacy "<PREFIX>-0001" and "<PREFIX>-0001/ddmmyyyy" patterns
  const docs = await CustomerInvoice.find({ invoiceNo: re }).select("invoiceNo").lean();
  const max = docs.reduce((m, d) => {
    const match = String(d.invoiceNo || "").match(re);
    const n = match ? parseInt(match[1], 10) : NaN;
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  // Optional manual floor from Finance settings (0 = pure auto-increment)
  const floor = Math.max(0, Math.floor(Number(settings?.invoiceNextNumber) || 0));
  const next = Math.max(max + 1, floor);
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, "0");
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${prefix}-${String(next).padStart(4, "0")}/${dd}${mm}${yyyy}`;
}

async function generateChequeReference() {
  const result = await CustomerInvoice.aggregate([
    { $unwind: "$payments" },
    { $match: { "payments.method": "CHEQUE" } },
    { $count: "total" },
  ]);
  const count = result[0]?.total || 0;
  return `CHQ-${String(count + 1).padStart(4, "0")}`;
}

const populateInvoice = (query) =>
  query
    .populate("salesOrderId", "orderNo status promisedDate shippedAt deliveredAt closedAt trackingNumber")
    .populate("customerId", "name email mf address")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role");

function buildLine(line, config) {
  const quantity = Number(line.quantity || 0);
  const inputUnitPrice = roundAmount(Number(line.unitPrice || 0));
  const discount = Math.min(100, Math.max(0, Number(line.discount || 0)));
  const tvaRate = config.applyTva ? Number(config.tvaRate || 0) : 0;
  const fodecRate = config.applyFodec ? Number(config.fodecRate || 0) : 0;
  const multiplier = 1 + tvaRate / 100 + fodecRate / 100;
  const baseUnitHt =
    config.pricingMode === "TTC_BASED"
      ? roundAmount(multiplier > 0 ? inputUnitPrice / multiplier : inputUnitPrice)
      : inputUnitPrice;
  const brutHt = roundAmount(baseUnitHt * quantity);
  const discountAmount = roundAmount(brutHt * discount / 100);
  const subtotalHt = roundAmount(brutHt - discountAmount);
  const totalVat = roundAmount(subtotalHt * (tvaRate / 100));
  const totalFodec = roundAmount(subtotalHt * (fodecRate / 100));
  const totalBeforeStamp =
    config.pricingMode === "TTC_BASED"
      ? roundAmount(inputUnitPrice * quantity * (1 - discount / 100))
      : roundAmount(subtotalHt + totalVat + totalFodec);

  return {
    productId: line.productId,
    description: line.productId?.name || "",
    quantity,
    inputUnitPrice,
    baseUnitHt,
    discount,
    discountAmount,
    subtotalHt,
    totalVat,
    totalFodec,
    totalBeforeStamp,
  };
}

function buildInstallments(totalAmount, plan = {}, issueDate = new Date()) {
  const mode = plan.mode || "CUSTOM";
  const startDate = plan.startDate ? new Date(plan.startDate) : new Date(issueDate);
  let amounts = [];
  let dates = [];

  if (mode === "CUSTOM") {
    amounts = Array.isArray(plan.amounts) ? plan.amounts.map((value) => roundAmount(value)) : [];
    dates = Array.isArray(plan.dates) ? plan.dates.map((value) => new Date(value)) : [];
    if (!amounts.length || amounts.length !== dates.length) {
      throw Object.assign(new Error("Custom Kumbil plan requires matching dates and amounts"), {
        statusCode: 400,
      });
    }
  } else {
    const intervalMap = { DAYS_30: 30, DAYS_60: 60, DAYS_90: 90 };
    const intervalDays = intervalMap[mode];
    const installmentsCount = Math.max(1, Number(plan.installmentsCount || 1));
    const baseAmount = roundAmount(Number(totalAmount || 0) / installmentsCount);
    amounts = Array.from({ length: installmentsCount }, (_, index) =>
      index === installmentsCount - 1
        ? roundAmount(Number(totalAmount || 0) - baseAmount * (installmentsCount - 1))
        : baseAmount
    );
    dates = Array.from({ length: installmentsCount }, (_, index) =>
      addDays(startDate, intervalDays * index)
    );
  }

  const totalPlanned = roundAmount(amounts.reduce((sum, value) => sum + value, 0));
  if (roundAmount(totalPlanned) !== roundAmount(totalAmount)) {
    throw Object.assign(new Error("Kumbil plan amounts must equal the targeted amount"), {
      statusCode: 400,
    });
  }

  return dates.map((dueDate, index) => ({
    dueDate,
    plannedAmount: amounts[index],
    paidAmount: 0,
    paidAt: null,
    status: "PENDING",
  }));
}

function resolveInstallmentBaseAmount(invoice, plan = {}) {
  const totalTtc = roundAmount(Number(invoice.totalTtc || 0));
  if (plan.remainingOnly) {
    const remaining = roundAmount(totalTtc - Number(invoice.amountPaid || 0));
    if (remaining <= 0) {
      throw Object.assign(new Error("No remaining amount is available for a Kumbil plan"), {
        statusCode: 400,
      });
    }
    return remaining;
  }
  return totalTtc;
}

function derivePaymentMethodFromSplits(splits = []) {
  const methods = Array.from(
    new Set(
      splits
        .map((split) => String(split.method || "").trim())
        .filter(Boolean)
    )
  );

  if (methods.length === 0) return "UNSET";
  if (methods.length === 1) return methods[0];
  return "MIXED";
}

function normalizeSettlementSplits(totalAmount, splits = []) {
  if (!Array.isArray(splits) || splits.length === 0) {
    throw Object.assign(new Error("At least one settlement split is required"), {
      statusCode: 400,
    });
  }

  const normalized = splits.map((split) => ({
    method: split.method,
    plannedAmount: roundAmount(Number(split.plannedAmount || 0)),
    dueDate: split.dueDate ? new Date(split.dueDate) : null,
    paidAmount: 0,
    status: "PENDING",
    notes: split.notes || "",
  }));

  if (normalized.some((split) => split.plannedAmount <= 0)) {
    throw Object.assign(new Error("Each settlement split must have a positive amount"), {
      statusCode: 400,
    });
  }

  const totalPlanned = roundAmount(
    normalized.reduce((sum, split) => sum + Number(split.plannedAmount || 0), 0)
  );
  if (totalPlanned !== roundAmount(totalAmount)) {
    throw Object.assign(
      new Error(`Settlement splits must equal the invoice total (${roundAmount(totalAmount)})`),
      { statusCode: 400 }
    );
  }

  return normalized;
}

function refreshSettlementSplitStatuses(invoice) {
  if (!Array.isArray(invoice.settlementSplits) || invoice.settlementSplits.length === 0) return;

  invoice.settlementSplits = invoice.settlementSplits.map((split) => {
    const plannedAmount = roundAmount(Number(split.plannedAmount || 0));
    const paidAmount = roundAmount(Number(split.paidAmount || 0));
    let status = "PENDING";
    if (paidAmount >= plannedAmount && plannedAmount > 0) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    }
    return {
      ...split.toObject?.() || split,
      plannedAmount,
      paidAmount,
      status,
    };
  });
}

function buildTaxDefaults(settings) {
  return {
    tvaRate: Number(settings?.defaultVatRate ?? 19),
    fodecRate: Number(settings?.defaultFodecRate ?? 1),
    timbreFiscal: roundAmount(Number(settings?.defaultTimbreFiscal ?? 1)),
  };
}

function recalculateInvoice(invoice, config = {}, defaults = buildTaxDefaults()) {
  const normalized = {
    pricingMode: config.pricingMode || invoice.pricingMode || "HT_BASED",
    applyTva: typeof config.applyTva === "boolean" ? config.applyTva : invoice.applyTva !== false,
    applyFodec:
      typeof config.applyFodec === "boolean" ? config.applyFodec : invoice.applyFodec !== false,
    tvaRate: Number(defaults.tvaRate),
    fodecRate: Number(defaults.fodecRate),
    timbreFiscal: roundAmount(Number(defaults.timbreFiscal)),
  };

  const rebuiltLines = invoice.lines.map((line) =>
    buildLine(
      {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice:
          normalized.pricingMode === "TTC_BASED"
            ? line.inputUnitPrice
            : line.baseUnitHt || line.inputUnitPrice,
        discount: line.discount || 0,
      },
      normalized
    )
  );

  invoice.pricingMode = normalized.pricingMode;
  invoice.applyTva = normalized.applyTva;
  invoice.applyFodec = normalized.applyFodec;
  invoice.tvaRate = normalized.tvaRate;
  invoice.fodecRate = normalized.fodecRate;
  invoice.timbreFiscal = normalized.timbreFiscal;
  invoice.lines = rebuiltLines;
  invoice.subtotalHt = roundAmount(rebuiltLines.reduce((sum, line) => sum + line.subtotalHt, 0));
  invoice.totalVat = roundAmount(rebuiltLines.reduce((sum, line) => sum + line.totalVat, 0));
  invoice.totalFodec = roundAmount(
    rebuiltLines.reduce((sum, line) => sum + line.totalFodec, 0)
  );
  invoice.totalBeforeStamp = roundAmount(
    rebuiltLines.reduce((sum, line) => sum + line.totalBeforeStamp, 0)
  );
  invoice.totalTtc = roundAmount(invoice.totalBeforeStamp + invoice.timbreFiscal);
}

function updateInvoicePaymentState(invoice) {
  const amountPaid = roundAmount(Number(invoice.amountPaid || 0));
  const totalTtc = roundAmount(Number(invoice.totalTtc || 0));
  const hasPendingCheque = (invoice.payments || []).some(
    (payment) => payment.method === "CHEQUE" && payment.status === "PENDING"
  );

  if (hasPendingCheque) {
    invoice.paymentStatus = "PENDING_CHEQUE";
    return;
  }

  if (amountPaid >= totalTtc && totalTtc > 0) {
    invoice.paymentStatus = "PAYEE";
    invoice.paidAt = invoice.paidAt || new Date();
    return;
  }

  if (invoice.paymentMethod === "KUMBIL") {
    invoice.paymentStatus = "PAYEE";
    invoice.paidAt = invoice.paidAt || new Date();
    return;
  }

  invoice.paymentStatus = amountPaid > 0 ? "PARTIELLEMENT_PAYEE" : "NON_PAYEE";
}

exports.getAllInvoices = async () =>
  populateInvoice(CustomerInvoice.find()).sort({ createdAt: -1 });

exports.getInvoiceById = async (id) => populateInvoice(CustomerInvoice.findById(id));

exports.getInvoiceByOrderId = async (orderId) =>
  populateInvoice(CustomerInvoice.findOne({ salesOrderId: orderId }));

exports.configureInvoice = async (id, payload = {}) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });

  const hasLineChanges =
    (Array.isArray(payload.lineOverrides) && payload.lineOverrides.length > 0) ||
    payload.pricingMode != null ||
    typeof payload.applyTva === "boolean" ||
    typeof payload.applyFodec === "boolean" ||
    Array.isArray(payload.settlementSplits);

  if (Array.isArray(payload.lineOverrides) && payload.lineOverrides.length > 0) {
    for (const override of payload.lineOverrides) {
      const line = invoice.lines[override.index];
      if (line && override.unitPrice != null) {
        line.inputUnitPrice = roundAmount(Number(override.unitPrice));
        line.baseUnitHt = roundAmount(Number(override.unitPrice));
      }
    }
  }

  if (payload.notes != null) {
    invoice.notes = payload.notes;
  }

  if (hasLineChanges) {
    const settings = await purchaseSettingService.getSettings();
    const taxDefaults = buildTaxDefaults(settings);
    recalculateInvoice(invoice, payload, taxDefaults);
  }

  if (payload.paymentMethod) invoice.paymentMethod = payload.paymentMethod;
  if (payload.dueDate) invoice.dueDate = new Date(payload.dueDate);
  if (payload.settlementSplits) {
    invoice.settlementSplits = normalizeSettlementSplits(invoice.totalTtc, payload.settlementSplits);
    invoice.paymentMethod = derivePaymentMethodFromSplits(invoice.settlementSplits);
  }

  if (invoice.paymentMethod === "KUMBIL") {
    invoice.installments = buildInstallments(
      resolveInstallmentBaseAmount(invoice, payload.installmentPlan || {}),
      payload.installmentPlan || {
        mode: "DAYS_30",
        installmentsCount: invoice.installments?.length || 1,
        startDate: invoice.issueDate || new Date(),
        remainingOnly: false,
      },
      invoice.issueDate || new Date()
    );
  } else {
    invoice.installments = [];
  }

  refreshSettlementSplitStatuses(invoice);
  updateInvoicePaymentState(invoice);
  await invoice.save();
  return exports.getInvoiceById(invoice._id);
};

exports.finalizeInvoice = async (id, userId = null, payload = {}) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });
  const settings = await purchaseSettingService.getSettings();
  const taxDefaults = buildTaxDefaults(settings);

  recalculateInvoice(invoice, payload, taxDefaults);
  if (payload.dueDate) invoice.dueDate = new Date(payload.dueDate);
  if (payload.paymentMethod) invoice.paymentMethod = payload.paymentMethod;
  if (payload.settlementSplits) {
    invoice.settlementSplits = normalizeSettlementSplits(invoice.totalTtc, payload.settlementSplits);
    invoice.paymentMethod = derivePaymentMethodFromSplits(invoice.settlementSplits);
  }

  if (payload.invoiceType && ["CLIENT", "SUPPLIER"].includes(payload.invoiceType)) {
    invoice.invoiceType = payload.invoiceType;
  }

  invoice.finalizedAt = invoice.finalizedAt || new Date();
  if (payload.note) {
    invoice.notes = [invoice.notes, payload.note].filter(Boolean).join("\n");
  }

  refreshSettlementSplitStatuses(invoice);
  updateInvoicePaymentState(invoice);
  await invoice.save();
  await financeService.recordInvoiceIssued(invoice);
  return exports.getInvoiceById(invoice._id);
};

exports.registerPayment = async (id, payload = {}) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });

  const method = payload.method || invoice.paymentMethod;
  if (!method || method === "UNSET") {
    throw Object.assign(new Error("Select a payment method first"), { statusCode: 400 });
  }

  const remaining = roundAmount(Number(invoice.totalTtc || 0) - Number(invoice.amountPaid || 0));
  const amount = roundAmount(Number(payload.amount || 0));
  if (amount <= 0 || amount > remaining) {
    throw Object.assign(new Error(`Payment amount must be between 0 and ${remaining}`), {
      statusCode: 400,
    });
  }

  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
  const splitIndex = payload.splitIndex != null ? Number(payload.splitIndex) : null;
  const selectedSplit =
    splitIndex != null && Array.isArray(invoice.settlementSplits)
      ? invoice.settlementSplits[splitIndex]
      : null;

  if (selectedSplit) {
    const splitRemaining = roundAmount(
      Number(selectedSplit.plannedAmount || 0) - Number(selectedSplit.paidAmount || 0)
    );
    if (amount > splitRemaining) {
      throw Object.assign(
        new Error(`Split payment must be between 0 and ${splitRemaining}`),
        { statusCode: 400 }
      );
    }
  }

  if (method === "CHEQUE") {
    invoice.payments.push({
      method,
      amount,
      paidAt,
      status: "PENDING",
      dueDate: addDays(paidAt, 8),
      reference: payload.reference || (await generateChequeReference()),
      notes: payload.notes || "",
      settlementSplitIndex: splitIndex,
    });
    if (!invoice.paymentMethod || invoice.paymentMethod === "UNSET") {
      invoice.paymentMethod = method;
    }
    updateInvoicePaymentState(invoice);
    await invoice.save();
    return exports.getInvoiceById(invoice._id);
  }

  if (method === "KUMBIL") {
    if (!invoice.installments.length) {
      throw Object.assign(new Error("Configure a Kumbil installment plan first"), {
        statusCode: 400,
      });
    }

    const installmentIndex =
      payload.installmentIndex != null
        ? Number(payload.installmentIndex)
        : invoice.installments.findIndex((item) => item.status !== "PAID");
    const installment = invoice.installments[installmentIndex];
    if (!installment) throw Object.assign(new Error("Installment not found"), { statusCode: 404 });

    const installmentRemaining = roundAmount(
      Number(installment.plannedAmount || 0) - Number(installment.paidAmount || 0)
    );
    if (amount > installmentRemaining) {
      throw Object.assign(
        new Error(`Installment payment must be between 0 and ${installmentRemaining}`),
        { statusCode: 400 }
      );
    }

    installment.paidAmount = roundAmount(Number(installment.paidAmount || 0) + amount);
    installment.paidAt = paidAt;
    installment.status = installment.paidAmount >= installment.plannedAmount ? "PAID" : "PARTIAL";
    invoice.payments.push({
      method,
      amount,
      paidAt,
      status: "CLEARED",
      installmentIndex,
      reference: payload.reference || "",
      notes: payload.notes || "",
      settlementSplitIndex: splitIndex,
    });
  } else {
    invoice.payments.push({
      method,
      amount,
      paidAt,
      status: "CLEARED",
      reference: payload.reference || "",
      notes: payload.notes || "",
      settlementSplitIndex: splitIndex,
    });
  }

  if (!invoice.paymentMethod || invoice.paymentMethod === "UNSET") {
    invoice.paymentMethod = method;
  }
  invoice.amountPaid = roundAmount(Number(invoice.amountPaid || 0) + amount);
  if (selectedSplit) {
    selectedSplit.paidAmount = roundAmount(Number(selectedSplit.paidAmount || 0) + amount);
  }
  if (invoice.amountPaid >= invoice.totalTtc) invoice.paidAt = paidAt;
  refreshSettlementSplitStatuses(invoice);
  updateInvoicePaymentState(invoice);
  await invoice.save();
  const payment = invoice.payments[invoice.payments.length - 1];
  await financeService.recordReglement({ invoice, payment });
  return exports.getInvoiceById(invoice._id);
};

exports.clearChequePayment = async (id, paymentId) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });

  const payment = invoice.payments.id(paymentId);
  if (!payment || payment.method !== "CHEQUE") {
    throw Object.assign(new Error("Cheque payment not found"), { statusCode: 404 });
  }
  if (payment.status !== "PENDING") {
    throw Object.assign(new Error("Cheque payment is not pending"), { statusCode: 400 });
  }
  if (payment.dueDate && new Date(payment.dueDate) > new Date()) {
    throw Object.assign(new Error("Cheque cannot be cleared before the 8-day delay"), {
      statusCode: 400,
    });
  }

  payment.status = "CLEARED";
  invoice.amountPaid = roundAmount(Number(invoice.amountPaid || 0) + Number(payment.amount || 0));
  if (
    payment.settlementSplitIndex != null &&
    Array.isArray(invoice.settlementSplits) &&
    invoice.settlementSplits[payment.settlementSplitIndex]
  ) {
    const split = invoice.settlementSplits[payment.settlementSplitIndex];
    split.paidAmount = roundAmount(Number(split.paidAmount || 0) + Number(payment.amount || 0));
  }
  if (invoice.amountPaid >= invoice.totalTtc) invoice.paidAt = new Date();
  refreshSettlementSplitStatuses(invoice);
  updateInvoicePaymentState(invoice);
  await invoice.save();
  await financeService.recordReglement({ invoice, payment });
  return exports.getInvoiceById(invoice._id);
};

exports.sendInvoice = async (id, userId = null, payload = {}) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });

  invoice.sentAt = new Date();
  invoice.sentBy = userId;
  if (payload.note) {
    invoice.notes = [invoice.notes, payload.note].filter(Boolean).join("\n");
  }
  await invoice.save();
  return exports.getInvoiceById(invoice._id);
};

exports.getAllKumbilInvoices = async () =>
  populateInvoice(
    CustomerInvoice.find({ paymentMethod: "KUMBIL", "installments.0": { $exists: true } })
  ).sort({ createdAt: -1 });

exports.cancelInstallment = async (id, index) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  if (index < 0 || index >= invoice.installments.length) {
    throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
  }
  invoice.installments.splice(index, 1);
  // If all installments removed, reset to unpaid so the invoice reappears in payments
  if (invoice.installments.length === 0) {
    invoice.paymentMethod = "UNSET";
    invoice.paymentStatus = roundAmount(Number(invoice.amountPaid || 0)) > 0
      ? "PARTIELLEMENT_PAYEE"
      : "NON_PAYEE";
    invoice.paidAt = null;
  }
  await invoice.save();
  return exports.getInvoiceById(invoice._id);
};

exports.sendReminder = async (id, userId = null, payload = {}) => {
  const invoice = await CustomerInvoice.findById(id);
  if (!invoice) throw Object.assign(new Error("Customer invoice not found"), { statusCode: 404 });
  if (!invoice.sentAt) {
    throw Object.assign(new Error("Invoice must be sent before reminders"), { statusCode: 400 });
  }
  if (invoice.paymentStatus === "PAYEE") {
    throw Object.assign(new Error("Paid invoices do not need reminders"), { statusCode: 400 });
  }

  invoice.reminders.push({
    sentAt: new Date(),
    channel: payload.channel || "MANUAL",
    note: payload.note || "",
    sentBy: userId,
  });
  invoice.reminderCount = Number(invoice.reminderCount || 0) + 1;
  invoice.lastReminderAt = new Date();
  await invoice.save();
  return exports.getInvoiceById(invoice._id);
};
