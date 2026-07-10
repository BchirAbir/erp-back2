const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const resellerSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone:       { type: String, default: "" },
    company:     { type: String, default: "" },
    address:     { type: String, default: "" },
    country:     { type: String, default: "" },
    taxId:       { type: String, default: "" },  // Numéro fiscal / matricule fiscale

    // ── Portal access ─────────────────────────────────────────────────────────
    password:    { type: String, default: "" },   // hashed — for e-commerce portal login
    status:      { type: String, enum: ["pending", "active", "suspended"], default: "pending" },

    // ── Business terms ────────────────────────────────────────────────────────
    discountPct: { type: Number, default: 0, min: 0, max: 100 }, // reseller discount %
    creditLimit: { type: Number, default: 0 },   // max outstanding balance in TND
    paymentTerms:{ type: String, default: "cash" }, // cash / 30j / 60j / 90j

    // ── Stats (updated on each request action) ────────────────────────────────
    totalOrders:  { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastOrderAt:  { type: Date,   default: null },

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes:{ type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Hash password before save
resellerSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

resellerSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.models.Reseller || mongoose.model("Reseller", resellerSchema);
