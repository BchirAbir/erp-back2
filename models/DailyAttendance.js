const mongoose = require("mongoose");

const dailyAttendanceSchema = new mongoose.Schema({
  employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employeeName: { type: String, required: true },
  department:   { type: String, required: true },
  date:         { type: String, required: true }, // "YYYY-MM-DD"
  checkIn:      { type: String, default: "" },    // "HH:MM"
  checkOut:     { type: String, default: "" },    // "HH:MM"
  status:       { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
  hoursWorked:  { type: Number, default: 0 },
  extraHours:   { type: Number, default: 0 },     // hours beyond 8
  note:         { type: String, default: "" },
  recordedBy:   { type: String, default: "" },
}, { timestamps: true });

// Unique per employee per day
dailyAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Guard against OverwriteModelError when the module is required more than once
module.exports = mongoose.models.DailyAttendance
  || mongoose.model("DailyAttendance", dailyAttendanceSchema);