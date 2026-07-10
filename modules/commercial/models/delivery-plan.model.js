const mongoose = require("mongoose");

const deliveryPlanSchema = new mongoose.Schema(
  {
    planNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    blNo: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    planDate: { type: Date, required: true },
    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    zone: { type: String, default: "", trim: true },
    planType: {
      type: String,
      enum: ["SHIPMENT", "DISCOVER"],
      default: "SHIPMENT",
    },
    startDate: { type: Date, default: null },
    fuelAddedLiters: { type: Number, default: 0, min: 0 },
    distanceKm: { type: Number, default: null, min: 0 },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" }],
    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "RETURNED", "CANCELLED"],
      default: "PLANNED",
    },
    livreurName: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    returnedOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" }],
    rmaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "RMA" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryPlan", deliveryPlanSchema);
