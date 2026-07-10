const mongoose = require("mongoose");

const inventoryCountLineSchema = new mongoose.Schema(
  {
    inventoryCountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCount",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      index: true,
    },
    systemQuantity: { type: Number, required: true, min: 0 },

    // Filled by Depot Manager when they do the physical count
    countedQuantity: { type: Number, default: 0, min: 0 },
    varianceQuantity: { type: Number, default: 0 },

    lotRef: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },

    // PENDING: waiting for depot manager to enter physical count
    // COUNTED: depot manager entered the quantity
    status: {
      type: String,
      enum: ["PENDING", "COUNTED"],
      default: "PENDING",
    },

    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    countedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inventoryCountLineSchema.pre("validate", function () {
  if (this.countedQuantity != null) {
    this.varianceQuantity = this.countedQuantity - this.systemQuantity;
  }
});

module.exports = mongoose.model("InventoryCountLine", inventoryCountLineSchema);
