const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employeeName: { type: String, required: true },
  department:   { type: String, required: true },
  date:         { type: String, required: true }, // "YYYY-MM-DD"
  type:         { type: String, enum: ["Annual Leave", "Sick Leave", "Remote Work", "Unpaid Leave", "Unauthorized"], required: true },
  hours:        { type: String, default: "8h" },
  status:       { type: String, enum: ["Approved", "Pending", "Rejected"], default: "Pending" },
  approvedBy:   { type: String, default: "" },
  note:         { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);