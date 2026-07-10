const mongoose = require("mongoose");

const marketingDocumentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Dashboard Report", "Invoice", "Quote", "Campaign Brief", "Budget Report", "Contract", "Other"],
    required: true,
  },
  fileName:   { type: String, required: true },
  filePath:   { type: String, required: true },
  mimeType:   { type: String, default: "application/pdf" },
  fileSize:   { type: Number, default: 0 },
  note:       { type: String, default: "" },
  uploadedBy: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.models.MarketingDocument ||
  mongoose.model("MarketingDocument", marketingDocumentSchema);