const mongoose = require("mongoose");

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "EMM TN", trim: true },
    mf: { type: String, default: "", trim: true },
    rne: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    rib: { type: String, default: "", trim: true },
    iban: { type: String, default: "", trim: true },
    bank: { type: String, default: "", trim: true },
    agence: { type: String, default: "", trim: true },
    // Prefix used for customer invoice numbers, e.g. "FC" -> FC-0001/ddmmyyyy
    invoicePrefix: { type: String, default: "FC", trim: true, uppercase: true },
    // Optional floor for the next invoice number. When set higher than the
    // current max, the next facture uses it; afterwards counting resumes
    // automatically. 0 = no override (pure auto-increment).
    invoiceNextNumber: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanySettings", companySettingsSchema);
