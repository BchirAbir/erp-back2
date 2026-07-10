const mongoose = require("mongoose");

const orderLineSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnlineProduct",
      required: true,
    },
    stockProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      default: null,
    },
    productName: { type: String, required: true },
    sku:         { type: String, required: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, default: null },
  },
  { _id: false }
);

const onlineOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      unique: true,
      trim: true,
      default: "",
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customer: {
      name:    { type: String, required: true, trim: true },
      email:   { type: String, default: "", trim: true, lowercase: true },
      phone:   { type: String, default: "" },
      address: { type: String, default: "" },
    },

    lines: {
      type: [orderLineSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one line",
      },
    },

    subtotal:    { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      default: null,
    },
    promotionCode:     { type: String, default: "" },
    promotionDiscount: { type: Number, default: 0 },

    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },

    commercialSalesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    commercialSalesOrderNo: { type: String, default: "" },

    stockReserved: { type: Boolean, default: false },

    trackingNumber: { type: String, default: "" },
    carrierName:    { type: String, default: "" },
    shippedAt:      { type: Date,   default: null },
    deliveredAt:    { type: Date,   default: null },

    notes: { type: String, default: "" },

    resellerId:      { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", default: null },
    isResellerOrder: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// ── Auto-generate orderNo — collision-safe ────────────────────────────────────
onlineOrderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNo) {
    const Model = mongoose.model("OnlineOrder");
    let orderNo, exists;
    do {
      const count = await Model.countDocuments();
      const pad   = String(count + 1 + Math.floor(Math.random() * 100)).padStart(4, "0");
      orderNo     = `WEB-${pad}`;
      exists      = await Model.findOne({ orderNo });
    } while (exists);
    this.orderNo = orderNo;
  }
});

module.exports =
  mongoose.models.OnlineOrder ||
  mongoose.model("OnlineOrder", onlineOrderSchema);