const mongoose = require("mongoose");

const tenderOfferSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    amountHt: {
      type: Number,
      required: true,
      min: 0,
    },
    leadTimeDays: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SELECTED", "REJECTED"],
      default: "PENDING",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const tenderSchema = new mongoose.Schema(
  {
    tenderNo: {
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
      index: true,
    },
    supplementaryRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplementaryRequest",
      default: null,
      index: true,
    },
    supplierIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
      },
    ],
    offers: [tenderOfferSchema],
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "COMPARING", "AWARDED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    selectedSupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    awardedAt: {
      type: Date,
      default: null,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tender", tenderSchema);
