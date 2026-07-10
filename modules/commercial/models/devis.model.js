const mongoose = require("mongoose");

const devisLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "StockProduct", required: true },
    description: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    inputUnitPrice: { type: Number, required: true, min: 0 },
    baseUnitHt: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotalHt: { type: Number, default: 0, min: 0 },
    totalVat: { type: Number, default: 0, min: 0 },
    totalFodec: { type: Number, default: 0, min: 0 },
    totalBeforeStamp: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const devisSchema = new mongoose.Schema(
  {
    devisNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
      unique: true,
      index: true,
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    customerName: { type: String, required: true, trim: true },
    customerMf: { type: String, default: "", trim: true },
    customerAddress: { type: String, default: "", trim: true },
    invoiceType: { type: String, enum: ["CLIENT", "SUPPLIER"], default: "CLIENT" },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "ACCEPTED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    pricingMode: { type: String, enum: ["HT_BASED", "TTC_BASED"], default: "HT_BASED" },
    applyTva: { type: Boolean, default: true },
    applyFodec: { type: Boolean, default: true },
    tvaRate: { type: Number, default: 19, min: 0 },
    fodecRate: { type: Number, default: 1, min: 0 },
    timbreFiscal: { type: Number, default: 1, min: 0 },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    subtotalHt: { type: Number, default: 0, min: 0 },
    totalVat: { type: Number, default: 0, min: 0 },
    totalFodec: { type: Number, default: 0, min: 0 },
    totalBeforeStamp: { type: Number, default: 0, min: 0 },
    totalTtc: { type: Number, default: 0, min: 0 },
    lines: [devisLineSchema],
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Devis", devisSchema);
