const mongoose = require("mongoose");

const depotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Depot name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Depot address is required"],
      trim: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Depot manager is required"],
    },
    productTypeScope: {
      type: String,
      enum: ["MP", "PF", "MP_PF"],
      required: [true, "Product type scope is required"],
    },
    capacityKg: {
      type: Number,
      min: 0,
      default: null,
    },
    capacityPackets: {
      type: Number,
      min: 0,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Depot", depotSchema);