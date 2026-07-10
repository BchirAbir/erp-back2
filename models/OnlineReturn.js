const mongoose = require("mongoose");

const onlineReturnSchema = new mongoose.Schema(
  {
    returnNo: {
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
    },
    productSummary: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["Defective", "Wrong item", "Not as described", "Changed mind", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded"],
      default: "pending",
    },
    adminNotes: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },

    commercialRmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RMA",
      default: null,
    },
    commercialRmaNo: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// ── Auto-generate returnNo — collision-safe ───────────────────────────────────
onlineReturnSchema.pre("save", async function () {
  if (this.isNew && !this.returnNo) {
    const Model = mongoose.model("OnlineReturn");
    let returnNo, exists;
    do {
      const count = await Model.countDocuments();
      const pad   = String(count + 1 + Math.floor(Math.random() * 100)).padStart(3, "0");
      returnNo    = `RET-${pad}`;
      exists      = await Model.findOne({ returnNo });
    } while (exists);
    this.returnNo = returnNo;
  }
});

module.exports =
  mongoose.models.OnlineReturn ||
  mongoose.model("OnlineReturn", onlineReturnSchema);