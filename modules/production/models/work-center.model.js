const mongoose = require("mongoose");

const workCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ["MACHINE", "ASSEMBLY", "QUALITY_CHECK", "PACKAGING"],
      default: "MACHINE",
    },
    capacityPerDay: { type: Number, default: 8, min: 1 }, // hours per day
    active: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkCenter", workCenterSchema);
