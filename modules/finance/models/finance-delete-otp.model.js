const mongoose = require("mongoose");

const financeDeleteOtpSchema = new mongoose.Schema({
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
});

module.exports = mongoose.model("FinanceDeleteOtp", financeDeleteOtpSchema);
