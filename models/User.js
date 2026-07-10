const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, "Name is required"], trim: true },
    email:    { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6 },
    role: {
      type: String,
      enum: [
        "ADMIN",
        "HR_MANAGER",
        "MARKETING_MANAGER",
        "SALES_MANAGER",
        "EMPLOYEE",
        "COMMERCIAL_MANAGER",
        "FINANCE_MANAGER",
        "STOCK_MANAGER",
        "PURCHASE_MANAGER",
        "PRODUCTION_MANAGER",
        "MAINTENANCE_MANAGER",
        "DEPOT_MANAGER",
  
      ],
      default: "EMPLOYEE",
    },
    department: {
      type: String,
      enum: ["HR", "Marketing", "Online Sales", "Commercial", "Finance", "Stock", "Purchase", "None"],
      default: "None",
    },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
    position:      { type: String, default: "" },
    phone:         { type: String, default: "" },
    salary:        { type: Number, default: 0 },
    // ── Bulletin de paie / payroll fields ──────────────────────────
    matricule:     { type: String, default: "" },
    cnssNumber:    { type: String, default: "" },   // employee personal CNSS number
    cin:           { type: String, default: "" },   // CIN — national ID number
    address:       { type: String, default: "" },
    qualification: { type: String, default: "" },   // e.g. "OUVRIER"
    category:      { type: String, default: "" },   // Catégorie
    echelon:       { type: String, default: "" },   // Échelon
    situation:     { type: String, default: "" },   // e.g. "T Titulaire"
    familyStatus:  { type: String, enum: ["", "C", "M", "D", "V"], default: "" }, // Célib./Marié/Divorcé/Veuf
    numChildren:   { type: Number, default: 0, min: 0 },
    hourlyRate:    { type: Number, default: 0, min: 0 },  // Taux horaire
    joinedDate:    { type: Date },
    accountStatus: {
      type: String,
      enum: ["none", "pending", "approved"],
      default: "none",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);