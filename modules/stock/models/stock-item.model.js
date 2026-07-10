const mongoose = require("mongoose");

const stockItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      unique: true,
      index: true,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    quantityReserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastMovementAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

stockItemSchema.pre("save", async function () {
  this.quantityAvailable = this.quantityOnHand - this.quantityReserved;
});

module.exports = mongoose.model("StockItem", stockItemSchema);
