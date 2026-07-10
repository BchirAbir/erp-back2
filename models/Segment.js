const mongoose = require("mongoose");

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Middle East"];
const COUNTRIES  = [
  "Tunisia", "Algeria", "Morocco", "Egypt", "Libya", "South Africa", "Nigeria", "Kenya",
  "France", "Germany", "Italy", "Spain", "United Kingdom", "Netherlands", "Belgium", "Switzerland",
  "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Jordan", "Lebanon",
  "China", "Japan", "South Korea", "India", "Singapore", "Malaysia",
  "United States", "Canada", "Brazil", "Mexico",
  "Australia", "New Zealand",
];

const segmentSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  customers:   { type: Number, default: 0 },
  avgSpend:    { type: Number, default: 0 },
  growthPct:   { type: Number, default: 0 },
  regionType:  { type: String, enum: ["Country", "Continent"], default: "Country" },
  region:      { type: String, default: "Tunisia" },
  status:      { type: String, enum: ["Growing", "Stable", "Declining", "At Risk", "To Discover"], default: "Stable" },
  description: { type: String, default: "" },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.models.Segment || mongoose.model("Segment", segmentSchema);