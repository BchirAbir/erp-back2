const mongoose = require("mongoose");

const stockAdjustmentSchema = new mongoose.Schema(
  {
    inventoryCountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCount",
      default: null,
    },
    inventoryCountLineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCountLine",
      default: null,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      index: true,
    },
    systemQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    countedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    deltaQuantity: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "APPLIED"],
      default: "PENDING_APPROVAL",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockAdjustment", stockAdjustmentSchema);