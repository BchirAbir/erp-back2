const mongoose = require("mongoose");

const integrationEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        "STOCK_RESERVED",
        "STOCK_RELEASED",
        "STOCK_DEDUCTED",
        "STOCK_ADJUSTED",
        "PURCHASE_RECEIPT_POSTED",
        "SUPPLIER_RETURN_POSTED",
        "PRODUCTION_CONSUMPTION_POSTED",
        "INVENTORY_CLOSED",
      ],
      required: true,
      index: true,
    },

    aggregateType: {
      type: String,
      enum: ["StockItem", "StockMovement", "StockAdjustment", "InventoryCount"],
      required: true,
    },

    aggregateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    sourceModule: {
      type: String,
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PURCHASE", "PRODUCTION", null],
      default: "STOCK",
    },

    sourceId: {
      type: String,
      default: "",
      trim: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IntegrationEvent", integrationEventSchema);
