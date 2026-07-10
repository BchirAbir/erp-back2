const mongoose = require("mongoose");

const commercialNotificationSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["COMMERCIAL"],
      default: "COMMERCIAL",
    },
    audience: {
      type: String,
      enum: ["INTERNAL", "CUSTOMER"],
      required: true,
    },
    eventType: {
      type: String,
      enum: ["ORDER_SHIPPED", "ORDER_DELIVERED"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommercialNotification", commercialNotificationSchema);
