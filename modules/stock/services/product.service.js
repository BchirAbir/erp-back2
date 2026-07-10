const Product = require("../models/product.model");
const StockItem = require("../models/stock-item.model");

exports.getAllProducts = async () => {
  return Product.find().sort({ createdAt: -1 });
};

exports.getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }
  return product;
};

exports.createProduct = async ({
  sku,
  name,
  type,
  unit,
  isLotTracked = false,
  status = "ACTIVE",
  purchasePrice = 0,
  createdBy = null,
}) => {
  const code = sku.trim().toUpperCase();
  const exists = await Product.findOne({ sku: code });
  if (exists) {
    throw Object.assign(new Error("SKU already exists"), { statusCode: 400 });
  }

  const product = await Product.create({
    sku: code,
    name,
    type,
    unit,
    isLotTracked,
    status,
    purchasePrice,
    createdBy,
    updatedBy: createdBy,
  });

  // Auto-create a zero-quantity stock item so it appears immediately in stock items list
  await StockItem.create({
    productId: product._id,
    quantityOnHand: 0,
    quantityReserved: 0,
    quantityAvailable: 0,
    status: "ACTIVE",
  });

  return product;
};

exports.updateProduct = async (
  id,
  { sku, name, type, unit, isLotTracked, status, purchasePrice, salePrice, updatedBy = null }
) => {
  const product = await Product.findById(id);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  if (sku && sku.trim().toUpperCase() !== product.sku) {
    const code = sku.trim().toUpperCase();
    const exists = await Product.findOne({
      sku: code,
      _id: { $ne: id },
    });
    if (exists) {
      throw Object.assign(new Error("SKU already exists"), { statusCode: 400 });
    }
    product.sku = code;
  }

  if (name !== undefined) product.name = name;
  if (type !== undefined) product.type = type;
  if (unit !== undefined) product.unit = unit;
  if (isLotTracked !== undefined) product.isLotTracked = isLotTracked;
  if (status !== undefined) product.status = status;
  if (purchasePrice !== undefined) product.purchasePrice = purchasePrice;
  if (salePrice !== undefined) product.salePrice = salePrice;
  product.updatedBy = updatedBy;

  await product.save();
  return product;
};

exports.deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  await StockItem.deleteOne({ productId: product._id });
  await product.deleteOne();
  return { message: "Product deleted successfully" };
};