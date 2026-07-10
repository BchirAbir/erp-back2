const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "ENTRY",
        "EXIT",
        "RESERVATION",
        "RELEASE",
        "DEDUCTION",
        "ADJUSTMENT",
        "PURCHASE_RECEIPT",
        "SUPPLIER_RETURN",
        "CUSTOMER_RETURN",
        "PRODUCTION_CONSUMPTION",
      ],
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    previousOnHand: {
      type: Number,
      required: true,
      min: 0,
    },
    newOnHand: {
      type: Number,
      required: true,
      min: 0,
    },

    previousReserved: {
      type: Number,
      required: true,
      min: 0,
    },
    newReserved: {
      type: Number,
      required: true,
      min: 0,
    },

    lotRef: {
      type: String,
      default: "",
      trim: true,
    },
    lotMode: {
      type: String,
      enum: ["FIFO", "LIFO", "MANUAL"],
      default: null,
    },

    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      default: null,
    },

    sourceModule: {
      type: String,
      enum: ["STOCK", "COMMERCIAL", "ACHAT", "PURCHASE", "PRODUCTION", "FINANCE"],
      default: "STOCK",
    },
    sourceType: {
      type: String,
      default: "",
      trim: true,
    },
    sourceId: {
      type: String,
      default: "",
      trim: true,
    },
    reference: {
      type: String,
      default: "",
      trim: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["POSTED", "PENDING_APPROVAL", "APPROVED", "REJECTED"],
      default: "POSTED",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
