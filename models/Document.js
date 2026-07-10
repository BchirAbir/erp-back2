const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  employeeName: { type: String, required: true },
  department:   { type: String, required: true },
  type: {
    type: String,
    enum: [
      // HR types
      "Contract", "Absence Reason", "Resignation", "Warning", "Medical Certificate", "ID Copy", "Attestation de travail",
      // Marketing types
      "Dashboard Report", "Invoice", "Quote", "Campaign Brief", "Budget Report",
      // Shared
      "Other",
    ],
    required: true,
  },
  fileName:   { type: String, required: true },
  filePath:   { type: String, required: true }, // path on disk e.g. uploads/hr/file.pdf
  fileData:   { type: String, default: "" },    // kept for migration — empty after migration
  mimeType:   { type: String, default: "application/pdf" },
  fileSize:   { type: Number },
  note:       { type: String, default: "" },
  uploadedBy: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.Document ||
  mongoose.model("Document", documentSchema);