const SkuSetting = require("../models/sku-setting.model");
const Product = require("../models/product.model");

exports.getAllSkuSettings = async () => {
  return SkuSetting.find().sort({ createdAt: -1 });
};

exports.getSkuSettingById = async (id) => {
  return SkuSetting.findById(id);
};

exports.createSkuSetting = async ({ skuName, skuMax, productType = null, createdBy = null }) => {
  const exists = await SkuSetting.findOne({ skuName: skuName.trim() });
  if (exists) {
    throw Object.assign(new Error("SKU setting name already exists"), { statusCode: 400 });
  }

  return SkuSetting.create({
    skuName: skuName.trim(),
    skuMax,
    productType: productType || null,
    createdBy,
  });
};

exports.updateSkuSetting = async (id, { skuName, skuMax, productType }) => {
  const existing = await SkuSetting.findById(id);
  if (!existing) {
    throw Object.assign(new Error("SKU setting not found"), { statusCode: 404 });
  }

  const oldPrefix = existing.skuName;
  const newPrefix = skuName?.trim() ?? oldPrefix;
  const newMax = skuMax ?? existing.skuMax;
  if (productType !== undefined) existing.productType = productType || null;

  if (newPrefix !== oldPrefix) {
    const duplicate = await SkuSetting.findOne({ skuName: newPrefix });
    if (duplicate) {
      throw Object.assign(new Error("SKU setting name already exists"), { statusCode: 400 });
    }
  }

  // Re-pad all product SKUs that use this prefix if prefix or digit count changed
  if (newPrefix !== oldPrefix || newMax !== existing.skuMax) {
    const products = await Product.find({ sku: new RegExp(`^${oldPrefix}-\\d+$`) });
    const bulkOps = products.map((p) => {
      const numPart = p.sku.slice(oldPrefix.length + 1);
      const paddedNum = String(Number(numPart)).padStart(newMax, "0");
      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { sku: `${newPrefix}-${paddedNum}` } },
        },
      };
    });
    if (bulkOps.length > 0) await Product.bulkWrite(bulkOps);
  }

  existing.skuName = newPrefix;
  existing.skuMax = newMax;

  await existing.save();
  return existing;
};

exports.updateCounter = async (id, counter) => {
  const existing = await SkuSetting.findById(id);
  if (!existing) {
    throw Object.assign(new Error("SKU setting not found"), { statusCode: 404 });
  }
  if (counter > existing.lastCounter) {
    existing.lastCounter = counter;
    await existing.save();
  }
  return existing;
};

exports.deleteSkuSetting = async (id) => {
  const existing = await SkuSetting.findById(id);
  if (!existing) {
    throw Object.assign(new Error("SKU setting not found"), { statusCode: 404 });
  }

  await SkuSetting.findByIdAndDelete(id);
  return { message: "SKU setting deleted successfully" };
};