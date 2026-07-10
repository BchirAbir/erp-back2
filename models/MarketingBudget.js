const mongoose = require("mongoose");

const monthAllocationSchema = new mongoose.Schema({
  month:     { type: String, required: true }, // "YYYY-MM"
  allocated: { type: Number, default: 0 },
  spent:     { type: Number, default: 0 },
}, { _id: false });

const marketingBudgetSchema = new mongoose.Schema({
  year:          { type: Number, required: true, unique: true },
  annualBudget:  { type: Number, default: 0 },
  monthlyAllocations: [monthAllocationSchema],
  setByAdmin:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Auto-create 12 month entries when budget is created
marketingBudgetSchema.pre("save", async function () {
  if (this.isNew && this.monthlyAllocations.length === 0) {
    const year = this.year;
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, "0")}`;
      this.monthlyAllocations.push({ month, allocated: 0, spent: 0 });
    }
  }
});

module.exports = mongoose.models.MarketingBudget ||
  mongoose.model("MarketingBudget", marketingBudgetSchema);