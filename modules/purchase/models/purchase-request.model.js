const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      index: true,
    },

    requestedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "STOCK",
    },

    availableBudget: {
      type: Number,
      default: 0,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "URGENT"],
      default: "NORMAL",
    },

    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },

    sourceAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockAlert",
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseRequest", purchaseRequestSchema);
