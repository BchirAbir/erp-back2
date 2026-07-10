const mongoose = require("mongoose");

const cyclicOrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    frequencyDays: { type: Number, required: true, min: 1 }, // 90 = every 3 months
    nextDueDate: { type: Date, required: true },
    lastFiredAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    notes: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CyclicOrder", cyclicOrderSchema);
