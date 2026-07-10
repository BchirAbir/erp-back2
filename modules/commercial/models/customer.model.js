const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    continent: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    mf: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    totalOrderAmount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
