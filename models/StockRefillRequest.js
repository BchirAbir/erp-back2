// models/StockRefillRequest.js
const mongoose = require("mongoose");

const lineSchema = new mongoose.Schema(
  {
    onlineProductId:  { type: mongoose.Schema.Types.ObjectId, ref: "OnlineProduct", required: true },
    stockProductId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    productName:      { type: String, required: true },
    sku:              { type: String, default: "" },
    currentStock:     { type: Number, default: 0 },
    minThreshold:     { type: Number, default: 0 },
    requestedQty:     { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const stockRefillRequestSchema = new mongoose.Schema(
  {
    requestNo: {
      type: String,
      unique: true,
      // generated via do...while race-condition-safe pattern
    },
    lines:       { type: [lineSchema], required: true, validate: v => v.length > 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "URGENT"],
      default: "NORMAL",
    },
    notes:       { type: String, default: "" },
    adminNotes:  { type: String, default: "" },
    requestedBy: { type: String, default: "" },
    resolvedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate requestNo via pre-save
stockRefillRequestSchema.pre("save", async function () {
  if (this.requestNo) return;
  let no;
  do {
    const count = await mongoose.model("StockRefillRequest").countDocuments();
    no = `REFILL-${String(count + 1).padStart(4, "0")}`;
  } while (await mongoose.model("StockRefillRequest").exists({ requestNo: no }));
  this.requestNo = no;
});

module.exports =
  mongoose.models.StockRefillRequest ||
  mongoose.model("StockRefillRequest", stockRefillRequestSchema);
