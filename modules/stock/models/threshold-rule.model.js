const mongoose = require("mongoose");

const thresholdRuleSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      unique: true,
      index: true,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    alertEnabled: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notifyRoles: {
      type: [String],
      default: ["ADMIN"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ThresholdRule", thresholdRuleSchema);