const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT", "MATIERE_PREMIERE"],
      required: true,
    },
    unit: {
      type: String,
      enum: ["pcs", "kg", "l", "m"],
      required: true,
    },
    isLotTracked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    category: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockProduct", productSchema);