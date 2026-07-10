const mongoose = require("mongoose");

const onlineShipmentSchema = new mongoose.Schema(
  {
    shipmentNo: {
      type: String,
      unique: true,
      trim: true,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnlineOrder",
      required: true,
    },
    orderNo: { type: String, required: true },
    customer: {
      name:  { type: String, required: true },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    productSummary: { type: String, default: "" },
    carrier: {
      type: String,
      enum: ["DHL", "Aramex", "TNT", "Other"],
      required: true,
    },
    trackingNumber: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "in-transit", "delivered", "failed"],
      default: "pending",
    },
    shippedAt:   { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    estimatedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// ── Auto-generate shipmentNo — collision-safe ─────────────────────────────────
onlineShipmentSchema.pre("save", async function () {
  if (this.isNew && !this.shipmentNo) {
    const Model = mongoose.model("OnlineShipment");
    let shipmentNo, exists;
    do {
      const count = await Model.countDocuments();
      const pad   = String(count + 1 + Math.floor(Math.random() * 100)).padStart(3, "0");
      shipmentNo  = `SHP-${pad}`;
      exists      = await Model.findOne({ shipmentNo });
    } while (exists);
    this.shipmentNo = shipmentNo;
  }
});

module.exports =
  mongoose.models.OnlineShipment ||
  mongoose.model("OnlineShipment", onlineShipmentSchema);