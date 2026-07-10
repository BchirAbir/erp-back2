const mongoose = require("mongoose");

const financeEntrySchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: [
        "PAYABLE_RECORDED",
        "PAYABLE_PAYMENT",
        "PAYABLE_CREDIT",
        "INVOICE_ISSUED",
        "REGLEMENT_RECU",
        "MANUAL_ENTRY",
        "FUEL_EXPENSE",
      ],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["INFLOW", "OUTFLOW", "NONE"],
      required: true,
      default: "NONE",
    },
    sourceModule: {
      type: String,
      enum: ["PURCHASE", "COMMERCIAL", "FINANCE"],
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    sourceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    reference: {
      type: String,
      default: "",
      trim: true,
    },
    counterpartyType: {
      type: String,
      enum: ["SUPPLIER", "CUSTOMER", "INTERNAL"],
      required: true,
    },
    counterpartyId: {
      type: String,
      default: "",
      trim: true,
    },
    counterpartyName: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "TND",
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "SETTLED", "INFO"],
      default: "INFO",
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

financeEntrySchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model("FinanceEntry", financeEntrySchema);
