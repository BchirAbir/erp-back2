const mongoose = require("mongoose");

const purchaseProductCategorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockProduct",
      required: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplementaryCategory",
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseProductCategory", purchaseProductCategorySchema);
