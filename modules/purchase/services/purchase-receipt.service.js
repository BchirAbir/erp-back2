const PurchaseReceipt = require("../models/purchase-receipt.model");
const PurchaseOrder = require("../models/purchase-order.model");
const PurchaseInvoice = require("../models/purchase-invoice.model");
const Depot = require("../../stock/models/depot.model");
const StockProduct = require("../../stock/models/product.model");
const Supplier = require("../models/supplier.model");
const stockMovementService = require("../../stock/services/stock-movement.service");

async function generateReceiptNo() {
  const count = await PurchaseReceipt.countDocuments();
  return `BR-${String(count + 1).padStart(4, "0")}`;
}

const populateReceipt = (query) =>
  query
    .populate({
      path: "purchaseOrderId",
      populate: [
        { path: "supplierId", select: "supplierNo name" },
        { path: "lines.productId", select: "name sku" },
      ],
    })
    .populate("depotId", "name productTypeScope")
    .populate("supplierId", "supplierNo name")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role");

exports.getAllReceipts = async () =>
  populateReceipt(PurchaseReceipt.find()).sort({ createdAt: -1 });

exports.getMyReceipts = async (userId) =>
  populateReceipt(PurchaseReceipt.find({ createdBy: userId })).sort({ createdAt: -1 });

exports.getReceiptById = async (id) => populateReceipt(PurchaseReceipt.findById(id));

exports.createReceipt = async ({
  purchaseOrderId,
  depotId,
  lines = [],
  supplierRating = null,
  notes = "",
  factureFile = null,
  createdBy = null,
}) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId).populate("supplierId");
  if (!purchaseOrder) {
    throw Object.assign(new Error("Purchase order not found"), { statusCode: 404 });
  }

  if (!["SENT", "RECEIVED"].includes(purchaseOrder.status)) {
    throw Object.assign(new Error("Only sent purchase orders can be received"), {
      statusCode: 400,
    });
  }

  if (!lines.length) {
    throw Object.assign(new Error("Add at least one receipt line"), { statusCode: 400 });
  }

  const hasStockLines = purchaseOrder.lines.some((l) => l.productId);

  let depot = null;
  if (hasStockLines) {
    if (!depotId) {
      throw Object.assign(new Error("Depot is required for stock orders"), { statusCode: 400 });
    }
    depot = await Depot.findById(depotId).select("status productTypeScope name");
    if (!depot || depot.status !== "ACTIVE") {
      throw Object.assign(new Error("Selected depot is not available"), { statusCode: 400 });
    }
  }

  const receiptLines = [];
  let hasRejected = false;

  for (const line of lines) {
    const poLine = purchaseOrder.lines.id(line.purchaseOrderLineId);
    if (!poLine) {
      throw Object.assign(new Error("Purchase order line not found"), { statusCode: 404 });
    }

    const remainingQty = Math.max(0, poLine.quantity - (poLine.receivedQuantity || 0));
    if (line.receivedQuantity <= 0 || line.receivedQuantity > remainingQty) {
      throw Object.assign(
        new Error(`Received quantity must be between 1 and ${remainingQty}`),
        { statusCode: 400 }
      );
    }

    if (line.acceptedQuantity < 0 || line.acceptedQuantity > line.receivedQuantity) {
      throw Object.assign(
        new Error("Accepted quantity must be between 0 and received quantity"),
        { statusCode: 400 }
      );
    }

    poLine.receivedQuantity = (poLine.receivedQuantity || 0) + line.acceptedQuantity;

    if (line.acceptedQuantity > 0 && poLine.productId) {
      const product = await StockProduct.findById(poLine.productId).select("type");
      if (!product) {
        throw Object.assign(new Error("Product not found"), { statusCode: 404 });
      }

      const allowed =
        depot.productTypeScope === "MP_PF" ||
        (product.type === "MATIERE_PREMIERE" && depot.productTypeScope === "MP") ||
        (product.type !== "MATIERE_PREMIERE" && depot.productTypeScope === "PF");

      if (!allowed) {
        throw Object.assign(
          new Error(`Selected depot cannot receive this product type`),
          { statusCode: 400 }
        );
      }

      await stockMovementService.createEntry({
        productId: poLine.productId,
        quantity: line.acceptedQuantity,
        lotRef: line.lotRef || "",
        depotId,
        sourceModule: "PURCHASE",
        sourceType: "PURCHASE_RECEIPT",
        sourceId: purchaseOrder._id.toString(),
        reference: purchaseOrder.orderNo,
        reason: "Purchase receipt accepted quantity",
        notes: line.discrepancyNotes || notes,
        createdBy,
      });
    }

    if (line.qualityStatus === "REJECTED" || line.acceptedQuantity < line.receivedQuantity) {
      hasRejected = true;
    }

    receiptLines.push({
      purchaseOrderLineId: poLine._id,
      productId: poLine.productId,
      orderedQuantity: poLine.quantity,
      previouslyReceivedQuantity: poLine.receivedQuantity - line.acceptedQuantity,
      receivedQuantity: line.receivedQuantity,
      acceptedQuantity: line.acceptedQuantity,
      qualityStatus: line.qualityStatus || "ACCEPTED",
      discrepancyNotes: line.discrepancyNotes || "",
      lotRef: line.lotRef || "",
    });
  }

  purchaseOrder.status = "RECEIVED";
  purchaseOrder.receivedAt = new Date();
  await purchaseOrder.save();

  const receipt = await PurchaseReceipt.create({
    receiptNo: await generateReceiptNo(),
    purchaseOrderId: purchaseOrder._id,
    supplierId: purchaseOrder.supplierId._id,
    depotId: depotId || null,
    lines: receiptLines,
    receiptStatus: hasRejected ? "LITIGATION" : "FULL",
    supplierRating: supplierRating ?? null,
    notes,
    factureFile: factureFile || null,
    createdBy,
  });

  if (supplierRating && supplierRating >= 1 && supplierRating <= 5) {
    const ratedReceipts = await PurchaseReceipt.find({
      supplierId: purchaseOrder.supplierId._id,
      supplierRating: { $gte: 1 },
    }).select("supplierRating");

    const count = ratedReceipts.length;
    const avg = ratedReceipts.reduce((sum, r) => sum + r.supplierRating, 0) / count;

    await Supplier.findByIdAndUpdate(purchaseOrder.supplierId._id, {
      rating: Math.round(avg * 10) / 10,
      ratingCount: count,
    });
  }

  // Auto-create a purchase invoice for this PO if none exists yet
  const existingInvoice = await PurchaseInvoice.findOne({ purchaseOrderId: purchaseOrder._id });
  if (!existingInvoice) {
    try {
      const purchaseInvoiceService = require("./purchase-invoice.service");
      const today = new Date();
      const due = new Date(today);
      due.setDate(due.getDate() + 30);
      await purchaseInvoiceService.createPurchaseInvoice({
        supplierInvoiceRef: receipt.receiptNo,
        supplierId: purchaseOrder.supplierId._id.toString(),
        purchaseOrderId: purchaseOrder._id.toString(),
        receiptIds: [receipt._id.toString()],
        invoiceDate: today.toISOString(),
        dueDate: due.toISOString(),
        applyTva: true,
        applyFodec: true,
        createdBy,
      });
    } catch (e) {
      // Non-fatal: receipt is already saved, invoice creation is best-effort
      console.warn("[auto-invoice] failed:", e.message);
    }
  }

  return exports.getReceiptById(receipt._id);
};
