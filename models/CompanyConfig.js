const mongoose = require("mongoose");

// Single-document company configuration (key: "default").
// Holds the company-level values shown on the bulletin de paie header,
// most importantly the company CNSS number set from the HR/admin side.
const companyConfigSchema = new mongoose.Schema(
  {
    key:            { type: String, default: "default", unique: true },
    companyName:    { type: String, default: "EMM Hardware" },
    establishment:  { type: String, default: "Établissement Mohamed Moalla Plus" },
    companyCnss:    { type: String, default: "" },              // header CNSS N°
    companyAddress: { type: String, default: "Sfax, Tunisia" },
    monthlyHours:   { type: Number, default: 208, min: 1 },     // hours used for "Nombre" (26 × 8)
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CompanyConfig ||
  mongoose.model("CompanyConfig", companyConfigSchema);