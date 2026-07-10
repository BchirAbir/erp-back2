const mongoose = require("mongoose");

const supplementaryCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "slate",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupplementaryCategory", supplementaryCategorySchema);
