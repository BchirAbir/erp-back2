const mongoose = require("mongoose");

const empruntPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.001 },
    method: {
      type: String,
      enum: ["ESPECE", "CHEQUE", "VIREMENT", "AUTRE"],
      default: "VIREMENT",
    },
    paidAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true, timestamps: true }
);

const empruntSchema = new mongoose.Schema(
  {
    empruntNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    lenderName: { type: String, required: true, trim: true },
    label: { type: String, default: "", trim: true },
    totalAmount: { type: Number, required: true, min: 0.001 },
    amountPaid: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["OPEN", "SETTLED"], default: "OPEN", index: true },
    startDate: { type: Date, default: Date.now },
    payments: { type: [empruntPaymentSchema], default: [] },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Expose remaining balance on every serialized document
empruntSchema.virtual("remainingAmount").get(function () {
  const remaining = Number(this.totalAmount || 0) - Number(this.amountPaid || 0);
  return Math.round((Math.max(0, remaining) + Number.EPSILON) * 1000) / 1000;
});

empruntSchema.set("toJSON", { virtuals: true });
empruntSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Emprunt", empruntSchema);