const mongoose = require("mongoose");

const purchasePaymentSchema = new mongoose.Schema(
  {
    paymentNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseInvoice",
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["BANK_TRANSFER", "CHECK", "CASH"],
      required: true,
      default: "BANK_TRANSFER",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    rsRate: { type: Number, default: 0, min: 0 },
    rsAmount: { type: Number, default: 0, min: 0 },
    rsType: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchasePayment", purchasePaymentSchema);
