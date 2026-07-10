const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  channel:     { type: String, enum: ["Email", "PPC", "Social", "Display", "Video", "Other"], required: true },
  status:      { type: String, enum: ["Active", "Paused", "Planned", "Completed"], default: "Planned" },
  leads:       { type: Number, default: 0 },
  budget:      { type: Number, default: 0 },   // allocated TND
  spend:       { type: Number, default: 0 },   // spent TND
  startDate:   { type: String, default: "" },  // "YYYY-MM-DD"
  endDate:     { type: String, default: "" },  // "YYYY-MM-DD"
  description: { type: String, default: "" },
  // Analytics metrics (updated manually by marketing manager)
  impressions:    { type: Number, default: 0 },
  openRate:       { type: Number, default: 0 }, // %
  ctr:            { type: Number, default: 0 }, // %
  conversionRate: { type: Number, default: 0 }, // %
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
