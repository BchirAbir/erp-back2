const mongoose = require("mongoose");

const EVENT_TYPES = [
  "Campaign Launch",
  "Trade Fair",
  "Press Conference",
  "Product Launch",
  "Promotion",
  "Social Media",
  "Workshop",
  "Networking",
  "Sponsorship",
  "Other",
];

const marketingEventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  type:        { type: String, enum: EVENT_TYPES, default: "Other" },
  description: { type: String, default: "" },
  date:        { type: String, required: true }, // "YYYY-MM-DD"
  monthKey:    { type: String, required: true }, // "YYYY-MM"
  budget:      { type: Number, required: true, min: 0 },
  status:      { type: String, enum: ["Planned", "Done", "Cancelled"], default: "Planned" },
  budgetRequestStatus: { type: String, enum: ["none", "requested"], default: "none" },
  budgetRequestNote:   { type: String, default: "" },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.models.MarketingEvent ||
  mongoose.model("MarketingEvent", marketingEventSchema);