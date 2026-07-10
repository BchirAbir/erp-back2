const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType:     { type: String, required: true },
    size:         { type: Number, required: true },
    data:         { type: Buffer, required: true },
    description:  { type: String, default: "" },
    module:       { type: String, default: "STOCK" },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockDocument", documentSchema);
