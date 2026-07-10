const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  discount:    { type: Number, required: true, min: 1, max: 100 }, // percentage
  type:        { type: String, enum: ["Seasonal", "Loyalty", "Referral", "VIP", "Other"], required: true },
  status:      { type: String, enum: ["Active", "Scheduled", "Paused", "Completed"], default: "Scheduled" },
  code:        { type: String, default: "", trim: true, uppercase: true },
  startDate:   { type: String, required: true }, // "YYYY-MM-DD"
  endDate:     { type: String, default: "" },    // "YYYY-MM-DD" or "" for ongoing
  description: { type: String, default: "" },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);