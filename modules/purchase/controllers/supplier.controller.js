const supplierService = require("../services/supplier.service");

exports.getAllSuppliers = async (req, reply) => {
  try {
    return reply.code(200).send(await supplierService.getAllSuppliers());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getSupplierById = async (req, reply) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    if (!supplier) {
      return reply.code(404).send({ message: "Supplier not found" });
    }
    return reply.code(200).send(supplier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createSupplier = async (req, reply) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return reply.code(201).send(supplier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateSupplier = async (req, reply) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return reply.code(200).send(supplier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.toggleSupplierBlock = async (req, reply) => {
  try {
    const supplier = await supplierService.toggleSupplierBlock(req.params.id, req.body);
    return reply.code(200).send(supplier);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
