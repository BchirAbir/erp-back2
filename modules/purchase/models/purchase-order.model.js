const mongoose = require("mongoose");

const purchaseOrderLineSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    vatRate: {
      type: Number,
      default: 19,
      min: 0,
      max: 100,
    },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      default: null,
    },
    department: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      default: null,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    lines: [purchaseOrderLineSchema],
    subtotalHt: {
      type: Number,
      default: 0,
      min: 0,
    },
    vatRate: {
      type: Number,
      default: 19,
      min: 0,
    },
    totalVat: {
      type: Number,
      default: 0,
      min: 0,
    },
    fodecRate: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalFodec: {
      type: Number,
      default: 0,
      min: 0,
    },
    timbreFiscal: {
      type: Number,
      default: 1,
      min: 0,
    },
    totalTtc: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryTerms: {
      type: String,
      default: "",
      trim: true,
    },
    paymentTerms: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "VALIDATED", "SENT", "RECEIVED", "CLOSED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    validationLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    validatedAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requestCreatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
