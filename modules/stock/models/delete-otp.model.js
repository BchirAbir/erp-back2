const mongoose = require("mongoose");

const deleteOtpSchema = new mongoose.Schema({
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
});

module.exports = mongoose.model("StockDeleteOtp", deleteOtpSchema);
