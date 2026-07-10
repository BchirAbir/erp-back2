// models/AuditLog.js

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:   { type: String, required: true },
    userRole:   { type: String, required: true },
    action:     { type: String, required: true }, // e.g. "CREATE_EMPLOYEE"
    actionLabel:{ type: String, required: true }, // e.g. "Created employee"
    target:     { type: String, default: "" },    // name of affected entity
    department: { type: String, default: "None" },
    meta:       { type: Object, default: {} },    // any extra context
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);