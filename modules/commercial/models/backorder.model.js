const mongoose = require("mongoose");

const backOrderLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
    },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReserved: { type: Number, required: true, default: 0, min: 0 },
    quantityBackordered: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const backOrderSchema = new mongoose.Schema(
  {
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },
    orderNo: { type: String, required: true, trim: true, uppercase: true },
    customerName: { type: String, required: true, trim: true },
    lines: { type: [backOrderLineSchema], default: [] },
    status: {
      type: String,
      enum: ["PENDING", "FULFILLED", "CANCELLED"],
      default: "PENDING",
    },
    productionRequestStatus: {
      type: String,
      enum: ["NONE", "PENDING", "DONE"],
      default: "NONE",
    },
    productionRequestedAt: { type: Date, default: null },
    productionCompletedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackOrder", backOrderSchema);
