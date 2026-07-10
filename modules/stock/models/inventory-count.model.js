const mongoose = require("mongoose");

const rejectionEntrySchema = new mongoose.Schema(
  {
    // Stock manager does not provide a reason — only who rejected and when
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, _id: false }
);

const depotResponseEntrySchema = new mongoose.Schema(
  {
    response: { type: String, required: true, trim: true },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, _id: false }
);

const inventoryCountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PERIODIC", "PERMANENT"],
      required: true,
    },
    status: {
      type: String,
      // IN_PROGRESS:      stock manager is adding lines (system qty auto-loaded)
      // SENT_TO_DEPOT:    sent to depot manager for physical counting
      // PENDING_APPROVAL: depot submitted counted quantities, waiting for stock manager
      // CLOSED:           stock manager approved, stock adjusted
      enum: ["IN_PROGRESS", "SENT_TO_DEPOT", "PENDING_APPROVAL", "CLOSED"],
      default: "IN_PROGRESS",
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Depot",
      default: null,
      index: true,
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startedAt: { type: Date, default: null },
    closedAt:  { type: Date, default: null },
    notes:     { type: String, default: "", trim: true },

    // PERIODIC: explicit date range
    dateDebut: { type: Date, default: null },
    dateFin:   { type: Date, default: null },

    // PERMANENT: fiscal year (e.g. 2025), only allowed once current date >= Jul 31 of that year
    year: { type: Number, default: null },

    // Full history of rejections (stock manager rejects silently — no reason)
    rejectionHistory: { type: [rejectionEntrySchema], default: [] },

    // Latest depot manager response to a rejection
    depotResponse: { type: String, default: "", trim: true },

    // Full history of depot responses
    depotResponseHistory: { type: [depotResponseEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryCount", inventoryCountSchema);
