const mongoose = require("mongoose");

const skuSettingSchema = new mongoose.Schema(
  {
    skuName: {
      type: String,
      required: [true, "SKU name is required"],
      trim: true,
      unique: true,
    },
    skuMax: {
      type: Number,
      required: [true, "SKU max is required"],
      min: 1,
    },
    lastCounter: {
      type: Number,
      default: 0,
      min: 0,
    },
    productType: {
      type: String,
      enum: ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkuSetting", skuSettingSchema);