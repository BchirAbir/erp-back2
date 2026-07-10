const mongoose = require("mongoose");

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    supplierInvoiceRef: {
      type: String,
      required: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    receiptIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseReceipt",
      },
    ],
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    subtotalHt: {
      type: Number,
      required: true,
      min: 0,
    },
    applyTva: {
      type: Boolean,
      default: true,
    },
    applyFodec: {
      type: Boolean,
      default: true,
    },
    tvaRate: {
      type: Number,
      default: 19,
      min: 0,
    },
    fodecRate: {
      type: Number,
      default: 1,
      min: 0,
    },
    timbreFiscal: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalVat: {
      type: Number,
      required: true,
      min: 0,
    },
    totalFodec: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBeforeStamp: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTtc: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedSubtotalHt: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedTotalVat: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedTotalFodec: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedTotalBeforeStamp: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedTotalTtc: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditNoteAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    matchingStatus: {
      type: String,
      enum: ["MATCHED", "MISMATCH"],
      default: "MATCHED",
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "PARTIALLY_PAID", "PAID"],
      default: "PENDING_APPROVAL",
      index: true,
    },
    legalizationStatus: {
      type: String,
      enum: ["NON_LEGALISEE", "LEGALISEE"],
      default: "NON_LEGALISEE",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attachmentUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);
