// models/OnlineProduct.js
const mongoose = require("mongoose");

// Represents a product listed in the Online Sales catalog.
// It references a StockProduct for inventory data, but carries its own
// online-specific fields (listed price, visibility, description, etc.)
const onlineProductSchema = new mongoose.Schema(
  {
    stockProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    onlinePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Minimum stock quantity before triggering low-stock warning
    minStockThreshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    // Tags for filtering / search
    tags: [{ type: String, trim: true }],

    // ── Online Sales allocation ──────────────────────────────────────────────
    // Units explicitly allocated to Online Sales from the warehouse.
    // Set by the Sales Manager. Independent from the total warehouse stock.
    // 0 = not yet allocated (inherits warehouse stock for display purposes).
    onlineAllocatedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  
  { timestamps: true }
);

module.exports =
  mongoose.models.OnlineProduct ||
  mongoose.model("OnlineProduct", onlineProductSchema);