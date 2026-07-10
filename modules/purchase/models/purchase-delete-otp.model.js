const mongoose = require("mongoose");

const purchaseDeleteOtpSchema = new mongoose.Schema({
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
});

module.exports = mongoose.model("PurchaseDeleteOtp", purchaseDeleteOtpSchema);
