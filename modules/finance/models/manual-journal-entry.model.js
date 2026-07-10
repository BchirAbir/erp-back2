const mongoose = require("mongoose");

const lineSchema = new mongoose.Schema(
  {
    accountCode: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    side: { type: String, enum: ["DEBIT", "CREDIT"], required: true },
    amount: { type: Number, required: true, min: 0.001 },
  },
  { _id: false }
);

const manualJournalEntrySchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: "", trim: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    lines: { type: [lineSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManualJournalEntry", manualJournalEntrySchema);
