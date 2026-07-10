// models/DeleteRequest.js
const mongoose = require("mongoose");

const deleteRequestSchema = new mongoose.Schema({
  documentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  documentName:  { type: String, required: true },
  employeeName:  { type: String, default: "" },
  department:    { type: String, default: "" },
  requestedBy:   { type: String, required: true },   // HR Manager name
  requestedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status:        { type: String, enum: ["Pending", "Approved", "Rejected", "Used"], default: "Pending" },
  code:          { type: String, default: null },     // 6-digit OTP
  codeExpiresAt: { type: Date,   default: null },
  approvedBy:    { type: String, default: "" },
  approvedAt:    { type: Date,   default: null },
  seenAt:        { type: Date,   default: null },  // set when HR dismisses the notification
}, { timestamps: true });

module.exports = mongoose.model("DeleteRequest", deleteRequestSchema);