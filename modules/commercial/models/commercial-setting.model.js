const mongoose = require("mongoose");

const commercialSettingSchema = new mongoose.Schema(
  {
    fuelPricePerLiter: { type: Number, default: 0, min: 0 },
    fuelPer10Km: { type: Number, default: 0, min: 0 },
    orderPrefix:  { type: String, default: "ORD",  trim: true, uppercase: true },
    orderPadding: { type: Number, default: 3, min: 1, max: 8 },
    planPrefix:   { type: String, default: "PLAN", trim: true, uppercase: true },
    planPadding:  { type: Number, default: 1, min: 1, max: 8 },
    blPrefix:     { type: String, default: "BL",   trim: true, uppercase: true },
    blPadding:    { type: Number, default: 3, min: 1, max: 8 },
    fuelTypes: [{
      name:                { type: String, trim: true, required: true },
      pricePerLiter:       { type: Number, default: 0, min: 0 },
      consumptionPer100Km: { type: Number, default: 0, min: 0 },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommercialSetting", commercialSettingSchema);
