const mongoose = require("mongoose");

const supplementaryRequestSchema = new mongoose.Schema(
  {
    requestNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "URGENT"],
      default: "NORMAL",
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupplementaryRequest", supplementaryRequestSchema);
