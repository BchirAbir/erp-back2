const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      enum: ["COMMERCIAL", "FINANCE", "STOCK", "PURCHASE"],
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
