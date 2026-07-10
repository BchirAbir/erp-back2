const Supplier = require("../models/supplier.model");

async function generateSupplierNo() {
  const count = await Supplier.countDocuments();
  return `SUP-${String(count + 1).padStart(4, "0")}`;
}

exports.getAllSuppliers = async () =>
  Supplier.find().sort({ createdAt: -1 });

exports.getSupplierById = async (id) => Supplier.findById(id);

exports.createSupplier = async (payload) => {
  const supplierNo = await generateSupplierNo();

  return Supplier.create({
    supplierNo,
    name: payload.name.trim(),
    contactName: payload.contactName || "",
    email: payload.email || "",
    phone: payload.phone || "",
    address: payload.address || "",
    rib: payload.rib || "",
    paymentTerms: payload.paymentTerms || "",
    category: (payload.category || "GENERAL").trim().toUpperCase(),
    rating: typeof payload.rating === "number" ? payload.rating : 0,
    notes: payload.notes || "",
    blockedReason: payload.blockedReason || "",
    priceHt: typeof payload.priceHt === "number" ? payload.priceHt : 0,
    leadTimeDays: typeof payload.leadTimeDays === "number" ? payload.leadTimeDays : 0,
  });
};

exports.updateSupplier = async (id, payload) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
  }

  Object.assign(supplier, {
    name: payload.name?.trim() ?? supplier.name,
    contactName: payload.contactName ?? supplier.contactName,
    email: payload.email ?? supplier.email,
    phone: payload.phone ?? supplier.phone,
    address: payload.address ?? supplier.address,
    rib: payload.rib ?? supplier.rib,
    paymentTerms: payload.paymentTerms ?? supplier.paymentTerms,
    category: payload.category
      ? payload.category.trim().toUpperCase()
      : supplier.category,
    rating: typeof payload.rating === "number" ? payload.rating : supplier.rating,
    notes: payload.notes ?? supplier.notes,
    blockedReason: payload.blockedReason ?? supplier.blockedReason,
    priceHt: typeof payload.priceHt === "number" ? payload.priceHt : supplier.priceHt,
    leadTimeDays: typeof payload.leadTimeDays === "number" ? payload.leadTimeDays : supplier.leadTimeDays,
    productIds: Array.isArray(payload.productIds) ? payload.productIds : supplier.productIds,
    productPrices: Array.isArray(payload.productPrices)
      ? payload.productPrices
          .filter((p) => p && p.productId)
          .map((p) => ({
            productId: p.productId,
            priceHt: Math.max(0, Number(p.priceHt) || 0),
          }))
      : supplier.productPrices,
  });

  await supplier.save();
  return supplier;
};

exports.toggleSupplierBlock = async (id, { blockedReason = "" } = {}) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) {
    throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
  }

  supplier.isBlocked = !supplier.isBlocked;
  supplier.blockedReason = supplier.isBlocked ? blockedReason : "";
  await supplier.save();
  return supplier;
};
