// models/OnlineSalesDocument.js
const mongoose = require("mongoose");

const onlineSalesDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Sales Report",
        "Customer Invoice",
        "Reseller Contract",
        "Return Notice (RMA)",
        "Refund Notice (RMA)", // legacy — kept so older documents still validate
        "Shipment Manifest",
        "Promotion Brief",
        "Other",
      ],
      required: true,
    },
    fileName:   { type: String, required: true },
    filePath:   { type: String, required: true },
    mimeType:   { type: String, default: "application/pdf" },
    fileSize:   { type: Number, default: 0 },
    note:       { type: String, default: "" },
    uploadedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.OnlineSalesDocument ||
  mongoose.model("OnlineSalesDocument", onlineSalesDocumentSchema);