const mongoose = require("mongoose");

const avanceSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employeeName: { type: String, required: true },
  department:   { type: String, required: true },
  amount:       { type: Number, required: true },
  reason:       { type: String, required: true },
  status:       { type: String, enum: ["Pending", "Approved", "Deducted"], default: "Pending" },
  approvedBy:   { type: String, default: "" },
  approvedAt:   { type: Date },
  deductedAt:   { type: Date },
  salaryBefore: { type: Number },
  salaryAfter:  { type: Number },
}, { timestamps: true });

module.exports = mongoose.model("Avance", avanceSchema);