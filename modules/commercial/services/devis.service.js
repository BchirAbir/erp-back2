const Devis = require("../models/devis.model");
const CustomerInvoice = require("../models/customer-invoice.model");
const SalesOrder = require("../models/sales-order.model");
const purchaseSettingService = require("../../purchase/services/purchase-setting.service");
const financeService = require("../../finance/services/finance.service");
const Notification = require("../../../models/Notification");

// Migration: move existing QUOTATION-stage CustomerInvoice docs to Devis collection
(async () => {
  try {
    const rawDocs = await CustomerInvoice.find({ documentStage: "QUOTATION" }).lean();
    let moved = 0;
    for (const doc of rawDocs) {
      const exists = await Devis.findOne({ salesOrderId: doc.salesOrderId });
      if (!exists) {
        const devisNo = String(doc.invoiceNo || "").startsWith("FC-")
          ? doc.invoiceNo.replace("FC-", "FE-")
          : doc.invoiceNo;
        await Devis.create({
          devisNo,
          salesOrderId: doc.salesOrderId,
          customerId: doc.customerId || null,
          customerName: doc.customerName || "Client",
          customerMf: doc.customerMf || "",
          customerAddress: doc.customerAddress || "",
          invoiceType: doc.invoiceType || "CLIENT",
          status: doc.quotationStatus || "PENDING",
          pricingMode: doc.pricingMode || "HT_BASED",
          applyTva: doc.applyTva !== false,
          applyFodec: doc.applyFodec !== false,
          tvaRate: doc.tvaRate ?? 19,
          fodecRate: doc.fodecRate ?? 1,
          timbreFiscal: doc.timbreFiscal ?? 1,
          issueDate: doc.issueDate || new Date(),
          dueDate: doc.dueDate || null,
          sentAt: doc.sentAt || null,
          sentBy: doc.sentBy || null,
          acceptedAt: doc.acceptedAt || null,
          rejectedAt: doc.rejectedAt || null,
          subtotalHt: doc.subtotalHt || 0,
          totalVat: doc.totalVat || 0,
          totalFodec: doc.totalFodec || 0,
          totalBeforeStamp: doc.totalBeforeStamp || 0,
          totalTtc: doc.totalTtc || 0,
          lines: (doc.lines || []).map((l) => ({
            productId: l.productId,
            description: l.description || "",
            quantity: l.quantity,
            inputUnitPrice: l.inputUnitPrice,
            baseUnitHt: l.baseUnitHt || 0,
            subtotalHt: l.subtotalHt || 0,
            totalVat: l.totalVat || 0,
            totalFodec: l.totalFodec || 0,
            totalBeforeStamp: l.totalBeforeStamp || 0,
          })),
          notes: doc.notes || "",
          createdBy: doc.createdBy || null,
        });
      }
      await CustomerInvoice.deleteOne({ _id: doc._id });
      moved++;
    }
    if (moved) console.log(`[migration] Moved ${moved} devis to devis collection`);
  } catch (e) {
    console.error("[migration] Devis migration failed:", e.message);
  }
})();

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

async function generateDevisNo(dateForSuffix) {
  // Match both "FE-0001" and "FE-0001/ddmmyyyy"
  const docs = await Devis.find({ devisNo: /^FE-\d+/ }).select("devisNo").lean();
  const max = docs.reduce((m, d) => {
    const match = String(d.devisNo || "").match(/^FE-(\d+)/);
    const n = match ? parseInt(match[1], 10) : NaN;
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  // Date suffix uses the Validité (due) date when available, else now
  const d = dateForSuffix ? new Date(dateForSuffix) : new Date();
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `FE-${String(max + 1).padStart(4, "0")}/${dd}${mm}${yyyy}`;
}

async function generateInvoiceNo(dateForSuffix) {
  // Configurable prefix (Finance settings), defaults to "FC"
  const settings = await financeService.getCompanySettings();
  const prefix = (settings?.invoicePrefix || "FC").toUpperCase().replace(/[^A-Z0-9]/g, "") || "FC";
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-(\\d+)`);
  const docs = await CustomerInvoice.find({ invoiceNo: re }).select("invoiceNo").lean();
  const max = docs.reduce((m, d) => {
    const match = String(d.invoiceNo || "").match(re);
    const n = match ? parseInt(match[1], 10) : NaN;
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  // Optional manual floor from Finance settings (0 = pure auto-increment)
  const floor = Math.max(0, Math.floor(Number(settings?.invoiceNextNumber) || 0));
  const next = Math.max(max + 1, floor);
  // Date suffix: use the provided date (e.g. devis validation date) or now
  const d = dateForSuffix ? new Date(dateForSuffix) : new Date();
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${prefix}-${String(next).padStart(4, "0")}/${dd}${mm}${yyyy}`;
}

function buildTaxDefaults(settings) {
  return {
    tvaRate: Number(settings?.defaultVatRate ?? 19),
    fodecRate: Number(settings?.defaultFodecRate ?? 1),
    timbreFiscal: roundAmount(Number(settings?.defaultTimbreFiscal ?? 1)),
  };
}

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
    description: line.description || "",
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

const populateDevis = (query) =>
  query
    .populate("salesOrderId", "orderNo status promisedDate")
    .populate("customerId", "name email mf address")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role");

exports.getAllDevis = async () =>
  populateDevis(Devis.find()).sort({ createdAt: -1 });

exports.getDevisById = async (id) =>
  populateDevis(Devis.findById(id));

exports.getDevisByOrderId = async (orderId) =>
  populateDevis(Devis.findOne({ salesOrderId: orderId }));

exports.createFromOrder = async (orderId, userId = null) => {
  const order = await SalesOrder.findById(orderId).populate("lines.productId customerId");
  if (!order) throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });

  // Split orders (ORD-002/1, etc.) never get their own devis.
  if (order.splitFromOrderId) return null;

  const settings = await purchaseSettingService.getSettings();
  const taxDefaults = buildTaxDefaults(settings);
  const customer = order.customerId;

  let devis = await Devis.findOne({ salesOrderId: orderId });

  const lineConfig = {
    pricingMode: order.pricingMode || "HT_BASED",
    applyTva: true,
    applyFodec: true,
    ...taxDefaults,
  };

  const builtLines = order.lines.map((line) =>
    buildLine(
      {
        productId: line.productId?._id || line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice || 0,
        discount: line.discount || 0,
        description: line.productId?.name || "",
      },
      lineConfig
    )
  );

  const subtotalHt = roundAmount(builtLines.reduce((s, l) => s + l.subtotalHt, 0));
  const totalVat = roundAmount(builtLines.reduce((s, l) => s + l.totalVat, 0));
  const totalFodec = roundAmount(builtLines.reduce((s, l) => s + l.totalFodec, 0));
  const totalBeforeStamp = roundAmount(builtLines.reduce((s, l) => s + l.totalBeforeStamp, 0));
  const totalTtc = roundAmount(totalBeforeStamp + taxDefaults.timbreFiscal);

  if (!devis) {
    devis = await Devis.create({
      devisNo: await generateDevisNo(order.promisedDate || new Date()),
      salesOrderId: order._id,
      customerId: customer?._id || order.customerId || null,
      customerName: order.customerName,
      customerMf: customer?.mf || "",
      customerAddress: customer?.address || "",
      invoiceType: "CLIENT",
      status: "PENDING",
      pricingMode: order.pricingMode || "HT_BASED",
      applyTva: true,
      applyFodec: true,
      tvaRate: taxDefaults.tvaRate,
      fodecRate: taxDefaults.fodecRate,
      timbreFiscal: taxDefaults.timbreFiscal,
      issueDate: new Date(),
      dueDate: order.promisedDate || null,
      lines: builtLines,
      subtotalHt,
      totalVat,
      totalFodec,
      totalBeforeStamp,
      totalTtc,
      notes: "",
      createdBy: userId,
    });
  } else {
    devis.customerId = customer?._id || order.customerId || null;
    devis.customerName = order.customerName;
    devis.customerMf = customer?.mf || devis.customerMf || "";
    devis.customerAddress = customer?.address || devis.customerAddress || "";
    devis.dueDate = order.promisedDate || devis.dueDate;
    devis.pricingMode = order.pricingMode || devis.pricingMode;
    devis.lines = builtLines;
    devis.subtotalHt = subtotalHt;
    devis.totalVat = totalVat;
    devis.totalFodec = totalFodec;
    devis.totalBeforeStamp = totalBeforeStamp;
    devis.totalTtc = totalTtc;
    await devis.save();
  }

  return exports.getDevisById(devis._id);
};

exports.acceptDevis = async (id) => {
  const devis = await Devis.findById(id);
  if (!devis) throw Object.assign(new Error("Devis not found"), { statusCode: 404 });
  if (!["PENDING", "SENT"].includes(devis.status)) {
    throw Object.assign(new Error("Only pending or sent devis can be accepted"), { statusCode: 400 });
  }
  devis.status = "ACCEPTED";
  devis.acceptedAt = new Date();
  await devis.save();

  // Notify finance that a devis has been accepted (awaiting invoice & payment)
  const total = Number(devis.totalTtc || 0);
  Notification.create({
    module: "FINANCE",
    eventType: "DEVIS_ACCEPTED",
    title: `Devis à régler : ${devis.devisNo}`,
    message: `Le devis ${devis.devisNo} (${total.toFixed(3)} TND) a été accepté par ${devis.customerName || "le client"} — en attente de règlement.`,
    metadata: {
      devisNo: devis.devisNo,
      devisId: String(devis._id),
      customerName: devis.customerName,
      amount: total,
    },
  }).catch(() => {});

  return exports.getDevisById(devis._id);
};

exports.deleteDevis = async (id) => {
  const devis = await Devis.findById(id);
  if (!devis) throw Object.assign(new Error("Devis not found"), { statusCode: 404 });
  await Devis.findByIdAndDelete(id);
  return { success: true };
};

exports.createInvoiceFromDevisById = async (devisId) => {
  const devis = await Devis.findById(devisId);
  if (!devis) throw Object.assign(new Error("Devis not found"), { statusCode: 404 });
  if (devis.status !== "ACCEPTED") {
    throw Object.assign(new Error("Seuls les devis acceptés peuvent être convertis en facture"), { statusCode: 400 });
  }
  const existing = await CustomerInvoice.findOne({ salesOrderId: devis.salesOrderId });
  if (existing) {
    throw Object.assign(new Error("Une facture existe déjà pour ce devis"), { statusCode: 409 });
  }
  return exports.createInvoiceFromDevis(devis.salesOrderId);
};

exports.createInvoiceFromDevis = async (orderId) => {
  const existingInvoice = await CustomerInvoice.findOne({ salesOrderId: orderId });
  if (existingInvoice) return existingInvoice;

  const devis = await Devis.findOne({ salesOrderId: orderId });
  if (!devis) return null;

  // Facture number date suffix = devis Validité (due) date
  const invoiceNo = await generateInvoiceNo(devis.dueDate || new Date());
  const invoice = await CustomerInvoice.create({
    invoiceNo,
    salesOrderId: devis.salesOrderId,
    customerId: devis.customerId || null,
    customerName: devis.customerName,
    customerMf: devis.customerMf || "",
    customerAddress: devis.customerAddress || "",
    invoiceType: devis.invoiceType || "CLIENT",
    pricingMode: devis.pricingMode || "HT_BASED",
    applyTva: devis.applyTva,
    applyFodec: devis.applyFodec,
    tvaRate: devis.tvaRate,
    fodecRate: devis.fodecRate,
    timbreFiscal: devis.timbreFiscal,
    issueDate: new Date(),
    dueDate: devis.dueDate || null,
    lines: devis.lines.map((l) => ({
      productId: l.productId,
      description: l.description || "",
      quantity: l.quantity,
      inputUnitPrice: l.inputUnitPrice,
      baseUnitHt: l.baseUnitHt,
      discount: l.discount || 0,
      discountAmount: l.discountAmount || 0,
      subtotalHt: l.subtotalHt,
      totalVat: l.totalVat,
      totalFodec: l.totalFodec,
      totalBeforeStamp: l.totalBeforeStamp,
    })),
    subtotalHt: devis.subtotalHt,
    totalVat: devis.totalVat,
    totalFodec: devis.totalFodec,
    totalBeforeStamp: devis.totalBeforeStamp,
    totalTtc: devis.totalTtc,
    notes: devis.notes || "",
    createdBy: devis.createdBy || null,
    // Auto-finalize so the invoice is immediately recognized in finance
    // (receivables, journal, income, règlement)
    finalizedAt: new Date(),
  });

  // Push the invoice into finance entries (INVOICE_ISSUED) so it shows up
  // in règlement / journal / KPIs as income
  await financeService.recordInvoiceIssued(invoice).catch((e) => {
    console.error("[devis] recordInvoiceIssued failed:", e.message);
  });

  return invoice;
};
