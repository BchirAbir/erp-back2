const mongoose = require("mongoose");

const productionOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    backorderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BackOrder",
      default: null,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    completedQty: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },
    workCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkCenter",
      default: null,
    },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    actualStart: { type: Date, default: null },
    actualEnd: { type: Date, default: null },
    estimatedHours: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductionOrder", productionOrderSchema);
