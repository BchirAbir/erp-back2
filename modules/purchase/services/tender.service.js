const Tender = require("../models/tender.model");
const PurchaseRequest = require("../models/purchase-request.model");
const SupplementaryRequest = require("../models/supplementary-request.model");
const Supplier = require("../models/supplier.model");
const purchaseOrderService = require("./purchase-order.service");

async function generateTenderNo() {
  const count = await Tender.countDocuments();
  return `AO-${String(count + 1).padStart(4, "0")}`;
}

const populateTender = (query) =>
  query
    .populate({
      path: "purchaseRequestId",
      populate: { path: "productId", select: "name sku category" },
    })
    .populate("supplementaryRequestId", "requestNo title category quantity unit department")
    .populate("supplierIds", "supplierNo name category isBlocked")
    .populate("selectedSupplierId", "supplierNo name")
    .populate("offers.supplierId", "supplierNo name")
    .populate("purchaseOrderId", "orderNo status")
    .populate("createdBy", "name email role");

exports.getAllTenders = async () =>
  populateTender(Tender.find()).sort({ createdAt: -1 });

exports.getTenderById = async (id) => populateTender(Tender.findById(id));

exports.createTender = async ({
  purchaseRequestId,
  supplementaryRequestId,
  supplierIds = [],
  notes = "",
  createdBy = null,
}) => {
  if (!purchaseRequestId && !supplementaryRequestId) {
    throw Object.assign(new Error("A purchase request or supplementary request is required"), {
      statusCode: 400,
    });
  }

  if (purchaseRequestId) {
    const purchaseRequest = await PurchaseRequest.findById(purchaseRequestId);
    if (!purchaseRequest) {
      throw Object.assign(new Error("Purchase request not found"), { statusCode: 404 });
    }
    if (purchaseRequest.status !== "APPROVED") {
      throw Object.assign(new Error("Only approved purchase requests can create a tender"), {
        statusCode: 400,
      });
    }
    const existing = await Tender.findOne({
      purchaseRequestId,
      status: { $in: ["DRAFT", "SENT", "COMPARING", "AWARDED"] },
    });
    if (existing) {
      throw Object.assign(new Error("A tender already exists for this purchase request"), {
        statusCode: 400,
      });
    }
  }

  if (supplementaryRequestId) {
    const suppRequest = await SupplementaryRequest.findById(supplementaryRequestId);
    if (!suppRequest) {
      throw Object.assign(new Error("Supplementary request not found"), { statusCode: 404 });
    }
    if (suppRequest.status !== "APPROVED") {
      throw Object.assign(new Error("Only approved supplementary requests can create a tender"), {
        statusCode: 400,
      });
    }
    const existing = await Tender.findOne({
      supplementaryRequestId,
      status: { $in: ["DRAFT", "SENT", "COMPARING", "AWARDED"] },
    });
    if (existing) {
      throw Object.assign(new Error("A tender already exists for this supplementary request"), {
        statusCode: 400,
      });
    }
  }

  const validSuppliers = await Supplier.find({
    _id: { $in: supplierIds },
    isBlocked: false,
  }).select("_id name priceHt leadTimeDays paymentTerms");

  const offers = validSuppliers.map((s) => ({
    supplierId: s._id,
    amountHt: s.priceHt || 0,
    leadTimeDays: s.leadTimeDays || 0,
    notes: s.paymentTerms || "",
  }));

  const tender = await Tender.create({
    tenderNo: await generateTenderNo(),
    purchaseRequestId: purchaseRequestId || null,
    supplementaryRequestId: supplementaryRequestId || null,
    supplierIds: validSuppliers.map((s) => s._id),
    offers,
    status: "COMPARING",
    notes,
    createdBy,
  });

  return exports.getTenderById(tender._id);
};

exports.updateSuppliers = async (id, supplierIds = []) => {
  const tender = await Tender.findById(id);
  if (!tender) {
    throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
  }
  if (tender.status === "AWARDED" || tender.status === "CANCELLED") {
    throw Object.assign(new Error("Cannot edit suppliers on a closed tender"), { statusCode: 400 });
  }

  const validSuppliers = await Supplier.find({
    _id: { $in: supplierIds },
    isBlocked: false,
  }).select("_id name priceHt leadTimeDays paymentTerms");

  tender.supplierIds = validSuppliers.map((s) => s._id);

  // Keep existing offers for retained suppliers, add new ones for new suppliers
  const existingOfferMap = new Map(
    tender.offers.map((o) => [String(o.supplierId), o])
  );
  tender.offers = validSuppliers.map((s) => {
    const existing = existingOfferMap.get(String(s._id));
    return existing || {
      supplierId: s._id,
      amountHt: s.priceHt || 0,
      leadTimeDays: s.leadTimeDays || 0,
      notes: s.paymentTerms || "",
    };
  });

  await tender.save();
  return exports.getTenderById(tender._id);
};

exports.sendTender = async (id) => {
  const tender = await Tender.findById(id);
  if (!tender) {
    throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
  }

  if (tender.status !== "DRAFT") {
    throw Object.assign(new Error("Only draft tenders can be sent"), { statusCode: 400 });
  }

  if (!tender.supplierIds.length) {
    throw Object.assign(new Error("Add at least one supplier before sending the tender"), {
      statusCode: 400,
    });
  }

  tender.status = "SENT";
  tender.sentAt = new Date();
  await tender.save();
  return exports.getTenderById(tender._id);
};

exports.addOffer = async (id, { supplierId, amountHt, leadTimeDays, notes = "" }) => {
  const tender = await Tender.findById(id);
  if (!tender) {
    throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
  }

  if (!["SENT", "COMPARING"].includes(tender.status)) {
    throw Object.assign(new Error("Offers can only be added after the tender is sent"), {
      statusCode: 400,
    });
  }

  const supplierAllowed = tender.supplierIds.some((entry) => String(entry) === String(supplierId));
  if (!supplierAllowed) {
    throw Object.assign(new Error("Supplier is not part of this tender"), { statusCode: 400 });
  }

  const existingOffer = tender.offers.find(
    (offer) => String(offer.supplierId) === String(supplierId)
  );

  if (existingOffer) {
    existingOffer.amountHt = amountHt;
    existingOffer.leadTimeDays = leadTimeDays;
    existingOffer.notes = notes;
    existingOffer.submittedAt = new Date();
  } else {
    tender.offers.push({
      supplierId,
      amountHt,
      leadTimeDays,
      notes,
    });
  }

  tender.status = "COMPARING";
  await tender.save();
  return exports.getTenderById(tender._id);
};

exports.createMissingPurchaseOrder = async (id, createdBy = null) => {
  const tender = await Tender.findById(id);
  if (!tender) {
    throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
  }
  if (tender.status !== "AWARDED") {
    throw Object.assign(new Error("Tender must be awarded first"), { statusCode: 400 });
  }
  if (tender.purchaseOrderId) {
    throw Object.assign(new Error("Purchase order already exists for this tender"), { statusCode: 400 });
  }

  const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
    tenderId: tender._id,
    createdBy,
  });
  tender.purchaseOrderId = purchaseOrder._id;
  await tender.save();

  return exports.getTenderById(tender._id);
};

exports.selectOffer = async (id, offerId, createdBy = null) => {
  const tender = await Tender.findById(id);
  if (!tender) {
    throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
  }

  const offer = tender.offers.id(offerId);
  if (!offer) {
    throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
  }

  tender.offers.forEach((entry) => {
    entry.status = String(entry._id) === String(offerId) ? "SELECTED" : "REJECTED";
  });
  tender.selectedSupplierId = offer.supplierId;
  tender.status = "AWARDED";
  tender.awardedAt = new Date();
  await tender.save();

  const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
    tenderId: tender._id,
    createdBy,
  });
  tender.purchaseOrderId = purchaseOrder._id;
  await tender.save();

  return exports.getTenderById(tender._id);
};
