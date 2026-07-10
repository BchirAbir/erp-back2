const productService = require("../services/product.service");
const { success, error } = require("../../../utils/response");

exports.getAllProducts = async (req, reply) => {
  try {
    const data = await productService.getAllProducts();
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.getProductById = async (req, reply) => {
  try {
    const data = await productService.getProductById(req.params.id);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.createProduct = async (req, reply) => {
  try {
    const data = await productService.createProduct({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return success(reply, data, 201);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.updateProduct = async (req, reply) => {
  try {
    const data = await productService.updateProduct(req.params.id, {
      ...req.body,
      updatedBy: req.user?.id || null,
    });
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.deleteProduct = async (req, reply) => {
  try {
    const data = await productService.deleteProduct(req.params.id);
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};

exports.updateSalePrice = async (req, reply) => {
  try {
    const data = await productService.updateProduct(req.params.id, { salePrice: req.body.salePrice });
    return success(reply, data);
  } catch (err) {
    return error(reply, err.message, err.statusCode || 500);
  }
};