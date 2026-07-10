const mongoose = require("mongoose");

const resellerRequestSchema = new mongoose.Schema(
  {
    requestNo: {
      type: String,
      default: "",
      unique: true,
    },

    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reseller",
      required: true,
    },

    lines: [
      {
        productId:   { type: mongoose.Schema.Types.ObjectId, ref: "OnlineProduct", required: true },
        productName: { type: String, default: "" },
        sku:         { type: String, default: "" },
        quantity:    { type: Number, required: true, min: 1 },
        unitPrice:   { type: Number, required: true, min: 0 },
        listPrice:   { type: Number, default: 0 },
      },
    ],

    subtotal:    { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled"],
      default: "pending",
    },

    notes:      { type: String, default: "" },
    adminNotes: { type: String, default: "" },
    resolvedAt: { type: Date,   default: null },

    commercialSalesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    commercialSalesOrderNo: { type: String, default: "" },
  },
  { timestamps: true }
);

// ── Auto-generate requestNo — collision-safe ──────────────────────────────────
resellerRequestSchema.pre("save", async function () {
  if (this.isNew && !this.requestNo) {
    const Model = this.constructor;
    let requestNo, exists;
    do {
      const count = await Model.countDocuments();
      const pad   = String(count + 1 + Math.floor(Math.random() * 100)).padStart(4, "0");
      requestNo   = `RES-${pad}`;
      exists      = await Model.findOne({ requestNo });
    } while (exists);
    this.requestNo = requestNo;
  }
});

module.exports =
  mongoose.models.ResellerRequest ||
  mongoose.model("ResellerRequest", resellerRequestSchema);