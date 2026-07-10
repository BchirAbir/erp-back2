const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    matricule: { type: String, required: true, unique: true, trim: true, uppercase: true },
    capacityKg: { type: Number, required: true, min: 0 },
    capacityPackets: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true },
    fuelType: { type: String, default: "", trim: true },
    fuelCapacityLiters: { type: Number, default: 0, min: 0 },
    durabilityPercent: { type: Number, default: 100, min: 0, max: 100 },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
