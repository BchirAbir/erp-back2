const mongoose = require("mongoose");

const carrierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    contactEmail: { type: String, default: "", trim: true },
    contactPhone: { type: String, default: "", trim: true },
    baseRateFlat: { type: Number, default: 0, min: 0 },
    transitDays: { type: Number, default: 2, min: 0 },
    active: { type: Boolean, default: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Carrier", carrierSchema);
