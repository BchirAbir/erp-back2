const mongoose = require("mongoose");

const purchaseReceiptLineSchema = new mongoose.Schema(
  {
    purchaseOrderLineId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      default: null,
    },
    orderedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    previouslyReceivedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    receivedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    acceptedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    qualityStatus: {
      type: String,
      enum: ["ACCEPTED", "WITH_RESERVATION", "REJECTED"],
      default: "ACCEPTED",
    },
    discrepancyNotes: {
      type: String,
      default: "",
      trim: true,
    },
    lotRef: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      default: null,
    },
    lines: [purchaseReceiptLineSchema],
    receiptStatus: {
      type: String,
      enum: ["PARTIAL", "FULL", "LITIGATION"],
      required: true,
      default: "PARTIAL",
    },
    supplierRating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    factureFile: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseReceipt", purchaseReceiptSchema);
