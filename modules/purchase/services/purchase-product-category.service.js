const PurchaseProductCategory = require("../models/purchase-product-category.model");

const populate = (q) =>
  q.populate("productId", "name sku type unit")
   .populate("categoryId", "name label color")
   .populate("createdBy", "name email");

exports.getAll = () =>
  populate(PurchaseProductCategory.find()).sort({ createdAt: -1 });

exports.create = async ({ productId, categoryId, createdBy }) => {
  if (!productId || !categoryId) {
    throw Object.assign(new Error("productId and categoryId required"), { statusCode: 400 });
  }
  const existing = await PurchaseProductCategory.findOne({ productId });
  if (existing) {
    existing.categoryId = categoryId;
    await existing.save();
    return populate(PurchaseProductCategory.findById(existing._id));
  }
  const doc = await PurchaseProductCategory.create({ productId, categoryId, createdBy });
  return populate(PurchaseProductCategory.findById(doc._id));
};

exports.update = async (id, data) => {
  const doc = await PurchaseProductCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!doc) throw Object.assign(new Error("Entrée introuvable"), { statusCode: 404 });
  return populate(PurchaseProductCategory.findById(doc._id));
};

exports.remove = async (id) => {
  const doc = await PurchaseProductCategory.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("Entrée introuvable"), { statusCode: 404 });
  return { success: true };
};
