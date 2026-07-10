const mongoose = require("mongoose");

const purchaseSettingSchema = new mongoose.Schema(
  {
    purchaseOrderPrefix: {
      type: String,
      default: "BC",
      trim: true,
      uppercase: true,
    },
    purchaseRequestPrefix: {
      type: String,
      default: "DA",
      trim: true,
      uppercase: true,
    },
    receiptPrefix: {
      type: String,
      default: "BR",
      trim: true,
      uppercase: true,
    },
    invoicePrefix: {
      type: String,
      default: "PF",
      trim: true,
      uppercase: true,
    },
    tenderPrefix: {
      type: String,
      default: "AO",
      trim: true,
      uppercase: true,
    },
    returnPrefix: {
      type: String,
      default: "RTF",
      trim: true,
      uppercase: true,
    },
    defaultVatRate: {
      type: Number,
      default: 19,
      min: 0,
      max: 100,
    },
    defaultFodecRate: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    defaultTimbreFiscal: {
      type: Number,
      default: 1,
      min: 0,
    },
    defaultCurrency: {
      type: String,
      default: "TND",
      trim: true,
      uppercase: true,
    },
    exchangeRateToTnd: {
      type: Number,
      default: 1,
      min: 0,
    },
    approvalMode: {
      type: String,
      enum: ["SINGLE_LEVEL", "MULTI_LEVEL"],
      default: "SINGLE_LEVEL",
    },
    lowPriorityNeedsApproval: {
      type: Boolean,
      default: true,
    },
    urgentAutoEscalation: {
      type: Boolean,
      default: true,
    },
    purchasedProductCategories: {
      type: [String],
      default: ["RAW_MATERIAL", "PACKAGING", "SERVICES"],
    },
    unitsOfMeasure: {
      type: [String],
      default: ["PCS", "KG", "L"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseSetting", purchaseSettingSchema);
