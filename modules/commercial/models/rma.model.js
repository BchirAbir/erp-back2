const mongoose = require("mongoose");

const rmaLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const rmaSchema = new mongoose.Schema(
  {
    rmaNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },
    orderNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    lines: {
      type: [rmaLineSchema],
      validate: {
        validator: (lines) => Array.isArray(lines) && lines.length > 0,
        message: "At least one return line is required",
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "OPEN", "RECEIVED", "RESTOCKED", "DISPOSED", "CLOSED", "CANCELLED", "REJECTED"],
      default: "OPEN",
    },
    // Online Sales sets this when authorizing / rejecting an RMA via the return flow
    rmaCase: {
      type: String,
      enum: ["", "AUTHORIZED", "NOT_AUTHORIZED"],
      default: "",
    },
    // Reference to the auto-generated RMA authorization PDF stored in OnlineSalesDocument
    rmaDocumentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnlineSalesDocument",
      default: null,
    },
    resolution: {
      type: String,
      enum: ["PENDING", "RESTOCK", "DESTROY"],
      default: "PENDING",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    receivedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("RMA", rmaSchema);