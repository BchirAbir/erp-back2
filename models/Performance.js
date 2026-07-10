// models/Performance.js
const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    employeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employeeName: { type: String, required: true },
    department:   { type: String, required: true },
    position:     { type: String, default: "" },
    managerId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managerName:  { type: String, default: "" },
    score:        { type: Number, required: true, min: 0, max: 100 },
    rating: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Poor"],
      required: true,
    },
    cycle:        { type: String, required: true }, // e.g. "2026-Q1"
    reviewDate:   { type: String, default: "" },    // "YYYY-MM-DD"
    notes:        { type: String, default: "" },
  },
  { timestamps: true }
);

// One evaluation per employee per cycle
performanceSchema.index({ employeeId: 1, cycle: 1 }, { unique: true });

module.exports = mongoose.model("Performance", performanceSchema);