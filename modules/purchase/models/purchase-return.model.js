const mongoose = require("mongoose");

const purchaseReturnLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      default: null,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    purchaseReceiptLineId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    vatRate: {
      type: Number,
      default: 19,
      min: 0,
    },
  },
  { _id: true }
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    purchaseReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseReceipt",
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseInvoice",
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    lines: [purchaseReturnLineSchema],
    totalHt: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTtc: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "VALIDATED", "SENT", "CLOSED"],
      default: "DRAFT",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    validatedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseReturn", purchaseReturnSchema);
