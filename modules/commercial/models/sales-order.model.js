const mongoose = require("mongoose");

const salesOrderLineSchema = new mongoose.Schema(
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
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    allocatedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      default: null,
    },
    plannedProductionQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    depotPreparedAt: {
      type: Date,
      default: null,
    },
    depotPreparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const salesOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    splitFromOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    source: {
      type: String,
      enum: ["MANUAL", "RECURRING"],
      default: "MANUAL",
    },
    status: {
      type: String,
      enum: ["DRAFT", "ORDONNANCED", "CONFIRMED", "PREPARED", "SHIPPED", "DELIVERED", "RETURNED", "CLOSED", "CANCELLED"],
      default: "DRAFT",
    },
    lines: {
      type: [salesOrderLineSchema],
      validate: {
        validator: (lines) => Array.isArray(lines) && lines.length > 0,
        message: "At least one order line is required",
      },
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    promisedDate: { type: Date, default: null },
    plannedStartDate: { type: Date, default: null },
    plannedEndDate: { type: Date, default: null },
    ordonnancedAt: { type: Date, default: null },
    ordonnancedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    preparedAt: { type: Date, default: null },
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickingSlipPrintedAt: { type: Date, default: null },
    pickingSlipPrintedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    packingValidatedAt: { type: Date, default: null },
    packingValidatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    trackingNumber: { type: String, default: "" },
    carrierId: { type: mongoose.Schema.Types.ObjectId, ref: "Carrier", default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    shippingCost: { type: Number, default: 0, min: 0 },
    shipmentAddress: { type: String, default: "", trim: true },
    pricingMode: {
      type: String,
      enum: ["HT_BASED", "TTC_BASED"],
      default: "HT_BASED",
    },
    isUrgent: { type: Boolean, default: false },
    shipApproval: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
        default: "NONE",
      },
      requestedAt: { type: Date, default: null },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approverNotes: { type: String, default: "" },
      rejectedAt: { type: Date, default: null },
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      rejectionReason: { type: String, default: "" },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for the list endpoints (sorted by createdAt, filtered by status)
salesOrderSchema.index({ createdAt: -1 });
salesOrderSchema.index({ status: 1 });

module.exports = mongoose.model("SalesOrder", salesOrderSchema);
