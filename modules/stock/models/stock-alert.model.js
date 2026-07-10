const mongoose = require("mongoose");

const stockAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      index: true,
    },
    thresholdRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ThresholdRule",
      default: null,
    },

    type: {
      type: String,
      enum: ["LOW_STOCK", "OUT_OF_STOCK", "NEGATIVE_RISK", "SYSTEM"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    thresholdQuantity: {
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: ["OPEN", "ACKNOWLEDGED", "PENDING", "CLOSED"],
      default: "OPEN",
    },

    actionType: {
      type: String,
      enum: ["PURCHASE", null],
      default: null,
    },

    actionSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    handledAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    triggeredByMovementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockMovement",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockAlert", stockAlertSchema);