const PurchaseReturn = require("../models/purchase-return.model");
const PurchaseInvoice = require("../models/purchase-invoice.model");
const PurchaseReceipt = require("../models/purchase-receipt.model");
const PurchaseOrder = require("../models/purchase-order.model");
const stockMovementService = require("../../stock/services/stock-movement.service");

async function generateReturnNo() {
  const count = await PurchaseReturn.countDocuments();
  return `RTF-${String(count + 1).padStart(4, "0")}`;
}

const populateReturn = (query) =>
  query
    .populate("supplierId", "supplierNo name")
    .populate("purchaseInvoiceId", "invoiceNo totalTtc creditNoteAmount")
    .populate("purchaseReceiptId", "receiptNo receiptStatus")
    .populate("purchaseOrderId", "orderNo")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role");

exports.getAllReturns = async () =>
  populateReturn(PurchaseReturn.find()).sort({ createdAt: -1 });

exports.getReturnById = async (id) =>
  populateReturn(PurchaseReturn.findById(id));

exports.getMyReturns = async (userId) =>
  populateReturn(PurchaseReturn.find({ createdBy: userId })).sort({ createdAt: -1 });

exports.createReturn = async ({ receiptId, reason, notes = "", createdBy = null }) => {
  const receipt = await PurchaseReceipt.findById(receiptId);
  if (!receipt) {
    throw Object.assign(new Error("Purchase receipt not found"), { statusCode: 404 });
  }

  const existingActive = await PurchaseReturn.findOne({
    purchaseReceiptId: receiptId,
    status: { $in: ["DRAFT", "VALIDATED", "SENT"] },
  });
  if (existingActive) {
    throw Object.assign(
      new Error("An active return already exists for this receipt"),
      { statusCode: 409 }
    );
  }

  const purchaseOrder = await PurchaseOrder.findById(receipt.purchaseOrderId);
  if (!purchaseOrder) {
    throw Object.assign(new Error("Purchase order not found"), { statusCode: 404 });
  }

  const poLineMap = new Map();
  for (const poLine of purchaseOrder.lines) {
    poLineMap.set(poLine._id.toString(), poLine);
  }

  const lines = [];
  let totalHt = 0;
  let totalTtc = 0;

  for (const receiptLine of receipt.lines) {
    const qty = receiptLine.acceptedQuantity || 0;
    if (qty <= 0) continue;

    const poLine = poLineMap.get(receiptLine.purchaseOrderLineId.toString());
    const unitPrice = poLine?.unitPrice || 0;
    const discountRate = poLine?.discountRate || 0;
    const vatRate = poLine?.vatRate ?? 19;
    const description = poLine?.description || "";

    const lineHt = qty * unitPrice * (1 - discountRate / 100);
    const lineTtc = lineHt * (1 + vatRate / 100);

    totalHt += lineHt;
    totalTtc += lineTtc;

    lines.push({
      productId: receiptLine.productId || null,
      description,
      purchaseReceiptLineId: receiptLine._id,
      quantity: qty,
      unitPrice,
      discountRate,
      vatRate,
    });
  }

  if (!lines.length) {
    throw Object.assign(new Error("Receipt has no accepted lines to return"), { statusCode: 400 });
  }

  const purchaseReturn = await PurchaseReturn.create({
    returnNo: await generateReturnNo(),
    purchaseReceiptId: receipt._id,
    purchaseOrderId: purchaseOrder._id,
    supplierId: receipt.supplierId,
    reason,
    lines,
    totalHt: Math.round(totalHt * 1000) / 1000,
    totalTtc: Math.round(totalTtc * 1000) / 1000,
    notes,
    status: "DRAFT",
    createdBy,
  });

  return exports.getReturnById(purchaseReturn._id);
};

exports.updateReturnStatus = async (id, status, updatedBy = null, userRole = null) => {
  const purchaseReturn = await PurchaseReturn.findById(id);
  if (!purchaseReturn) {
    throw Object.assign(new Error("Purchase return not found"), { statusCode: 404 });
  }

  const allowedTransitions = {
    DRAFT: ["VALIDATED"],
    VALIDATED: ["SENT"],
    SENT: ["CLOSED"],
    CLOSED: [],
  };

  if (!allowedTransitions[purchaseReturn.status]?.includes(status)) {
    throw Object.assign(
      new Error(`Cannot move return from ${purchaseReturn.status} to ${status}`),
      { statusCode: 400 }
    );
  }

  if (status === "VALIDATED" && !["ADMIN", "PURCHASE_MANAGER"].includes(userRole)) {
    throw Object.assign(
      new Error("Only a purchase manager can validate a return"),
      { statusCode: 403 }
    );
  }

  const now = new Date();

  if (status === "VALIDATED") {
    purchaseReturn.validatedAt = now;
  }

  if (status === "SENT") {
    const receipt = await PurchaseReceipt.findById(purchaseReturn.purchaseReceiptId);

    for (const line of purchaseReturn.lines) {
      if (!line.productId) continue;
      await stockMovementService.createExit({
        productId: line.productId,
        quantity: line.quantity,
        sourceModule: "PURCHASE",
        sourceType: "PURCHASE_RETURN",
        sourceId: purchaseReturn._id.toString(),
        reference: purchaseReturn.returnNo,
        reason: `Return: ${purchaseReturn.reason}`,
        notes: purchaseReturn.notes || "",
        createdBy: updatedBy,
      });
    }

    const invoice = await PurchaseInvoice.findOne({
      purchaseOrderId: purchaseReturn.purchaseOrderId,
    });
    if (invoice) {
      invoice.creditNoteAmount = (invoice.creditNoteAmount || 0) + purchaseReturn.totalTtc;
      await invoice.save();
      purchaseReturn.purchaseInvoiceId = invoice._id;
    }

    purchaseReturn.sentAt = now;
  }

  if (status === "CLOSED") {
    purchaseReturn.closedAt = now;
  }

  purchaseReturn.status = status;
  await purchaseReturn.save();

  return exports.getReturnById(purchaseReturn._id);
};
