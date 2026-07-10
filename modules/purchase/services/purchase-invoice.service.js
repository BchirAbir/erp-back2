const PurchaseInvoice = require("../models/purchase-invoice.model");
const PurchaseOrder = require("../models/purchase-order.model");
const PurchaseReceipt = require("../models/purchase-receipt.model");
const Supplier = require("../models/supplier.model");
const financeService = require("../../finance/services/finance.service");
const purchaseSettingService = require("./purchase-setting.service");

async function generatePurchaseInvoiceNo() {
  const count = await PurchaseInvoice.countDocuments();
  return `PF-${String(count + 1).padStart(4, "0")}`;
}

const populateInvoice = (query) =>
  query
    .populate("supplierId", "supplierNo name paymentTerms")
    .populate("purchaseOrderId", "orderNo status totalTtc")
    .populate("receiptIds", "receiptNo receiptStatus totalTtc createdAt")
    .populate("createdBy", "name email role");

function roundAmount(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function buildInvoiceTaxConfig(settings, payload = {}) {
  return {
    applyTva: payload.applyTva !== false,
    applyFodec: payload.applyFodec !== false,
    tvaRate: Number(settings?.defaultVatRate || 0),
    fodecRate: Number(settings?.defaultFodecRate || 0),
    timbreFiscal: roundAmount(Number(settings?.defaultTimbreFiscal || 0)),
  };
}

function computeInvoiceTotals(subtotalHt, taxConfig) {
  const baseHt = roundAmount(Number(subtotalHt || 0));
  const totalFodec = roundAmount(
    baseHt * (taxConfig.applyFodec ? Number(taxConfig.fodecRate || 0) / 100 : 0)
  );
  const totalVat = roundAmount(
    (baseHt + totalFodec) * (taxConfig.applyTva ? Number(taxConfig.tvaRate || 0) / 100 : 0)
  );
  const totalBeforeStamp = roundAmount(baseHt + totalFodec + totalVat);
  const totalTtc = roundAmount(totalBeforeStamp + Number(taxConfig.timbreFiscal || 0));

  return {
    subtotalHt: baseHt,
    totalVat,
    totalFodec,
    totalBeforeStamp,
    totalTtc,
  };
}

function computeLineAmounts(line, quantity) {
  const lineHt = quantity * line.unitPrice * (1 - (line.discountRate || 0) / 100);
  const lineVat = lineHt * ((line.vatRate || 0) / 100);
  return {
    subtotalHt: lineHt,
    totalVat: lineVat,
    totalTtc: lineHt + lineVat,
  };
}

exports.getAllPurchaseInvoices = async () =>
  populateInvoice(PurchaseInvoice.find()).sort({ createdAt: -1 });

exports.getPurchaseInvoiceById = async (id) =>
  populateInvoice(PurchaseInvoice.findById(id));

exports.createPurchaseInvoice = async ({
  supplierInvoiceRef,
  supplierId,
  purchaseOrderId,
  receiptIds = [],
  invoiceDate,
  dueDate,
  applyTva = true,
  applyFodec = true,
  subtotalHt: manualSubtotalHt,
  attachmentUrl = null,
  notes = "",
  createdBy = null,
}) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw Object.assign(new Error("Purchase order not found"), { statusCode: 404 });
  }

  if (!["SENT", "RECEIVED", "CLOSED"].includes(purchaseOrder.status)) {
    throw Object.assign(new Error("Invoice requires a sent or received purchase order"), {
      statusCode: 400,
    });
  }

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
  }

  if (purchaseOrder.supplierId.toString() !== supplierId) {
    throw Object.assign(new Error("Supplier does not match the purchase order"), {
      statusCode: 400,
    });
  }

  const receipts = receiptIds.length
    ? await PurchaseReceipt.find({
        _id: { $in: receiptIds },
        purchaseOrderId,
      })
    : [];

  if (receiptIds.length && receipts.length !== receiptIds.length) {
    throw Object.assign(new Error("Some receipts were not found for this purchase order"), {
      statusCode: 400,
    });
  }

  const acceptedByLine = new Map();
  for (const receipt of receipts) {
    for (const line of receipt.lines) {
      const key = line.purchaseOrderLineId.toString();
      acceptedByLine.set(key, (acceptedByLine.get(key) || 0) + line.acceptedQuantity);
    }
  }

  let expectedSubtotalHt = 0;
  const settings = await purchaseSettingService.getSettings();
  const taxConfig = buildInvoiceTaxConfig(settings, { applyTva, applyFodec });

  if (receipts.length > 0) {
    for (const line of purchaseOrder.lines) {
      const acceptedQty = acceptedByLine.get(line._id.toString()) || 0;
      if (acceptedQty > 0) {
        const totals = computeLineAmounts(line, acceptedQty);
        expectedSubtotalHt += totals.subtotalHt;
      }
    }
  } else {
    expectedSubtotalHt = purchaseOrder.subtotalHt;
  }

  const expectedTotals = computeInvoiceTotals(expectedSubtotalHt, taxConfig);
  const actualTotals =
    manualSubtotalHt !== undefined
      ? computeInvoiceTotals(manualSubtotalHt, taxConfig)
      : expectedTotals;

  const matchingStatus =
    actualTotals.subtotalHt === expectedTotals.subtotalHt &&
    actualTotals.totalVat === expectedTotals.totalVat &&
    actualTotals.totalFodec === expectedTotals.totalFodec &&
    actualTotals.totalTtc === expectedTotals.totalTtc
      ? "MATCHED"
      : "MISMATCH";

  const invoice = await PurchaseInvoice.create({
    invoiceNo: await generatePurchaseInvoiceNo(),
    supplierInvoiceRef,
    supplierId,
    purchaseOrderId,
    receiptIds,
    invoiceDate,
    dueDate,
    subtotalHt: actualTotals.subtotalHt,
    applyTva: taxConfig.applyTva,
    applyFodec: taxConfig.applyFodec,
    tvaRate: taxConfig.tvaRate,
    fodecRate: taxConfig.fodecRate,
    timbreFiscal: taxConfig.timbreFiscal,
    totalVat: actualTotals.totalVat,
    totalFodec: actualTotals.totalFodec,
    totalBeforeStamp: actualTotals.totalBeforeStamp,
    totalTtc: actualTotals.totalTtc,
    expectedSubtotalHt: expectedTotals.subtotalHt,
    expectedTotalVat: expectedTotals.totalVat,
    expectedTotalFodec: expectedTotals.totalFodec,
    expectedTotalBeforeStamp: expectedTotals.totalBeforeStamp,
    expectedTotalTtc: expectedTotals.totalTtc,
    matchingStatus,
    notes,
    attachmentUrl,
    createdBy,
  });

  return exports.getPurchaseInvoiceById(invoice._id);
};

exports.updatePurchaseInvoiceStatus = async (id, status, payload = {}) => {
  const invoice = await PurchaseInvoice.findById(id);
  if (!invoice) {
    throw Object.assign(new Error("Purchase invoice not found"), { statusCode: 404 });
  }

  const currentStatus = invoice.status;
  const allowedTransitions = {
    PENDING_APPROVAL: ["APPROVED", "REJECTED"],
    APPROVED: ["PARTIALLY_PAID", "PAID"],
    REJECTED: [],
    PARTIALLY_PAID: ["PAID"],
    PAID: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(status)) {
    throw Object.assign(
      new Error(`Cannot move purchase invoice from ${currentStatus} to ${status}`),
      { statusCode: 400 }
    );
  }

  if (status === "APPROVED" && invoice.matchingStatus === "MISMATCH") {
    throw Object.assign(
      new Error("A mismatched invoice cannot be approved before correction"),
      { statusCode: 400 }
    );
  }

  if (status === "PARTIALLY_PAID" || status === "PAID") {
    const amountPaid = Number(payload.amountPaid || 0);
    if (amountPaid <= 0 || amountPaid > invoice.totalTtc) {
      throw Object.assign(new Error("Amount paid must be between 0 and invoice total"), {
        statusCode: 400,
      });
    }
    invoice.amountPaid = amountPaid;
  }

  if (status === "PAID") {
    invoice.amountPaid = invoice.totalTtc;
  }

  if (status === "REJECTED") {
    invoice.rejectionReason = payload.rejectionReason || "";
    invoice.rejectedAt = new Date();
  }

  if (status === "APPROVED") {
    invoice.approvedAt = new Date();
    invoice.legalizationStatus = "LEGALISEE";
  }

  invoice.status = status;
  await invoice.save();
  if (status === "APPROVED") {
    await financeService.recordPurchaseInvoiceApproved(invoice);
  }
  return exports.getPurchaseInvoiceById(invoice._id);
};
