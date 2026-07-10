const PurchaseOrder = require("../models/purchase-order.model");
const PurchaseRequest = require("../models/purchase-request.model");
const Tender = require("../models/tender.model");
const Supplier = require("../models/supplier.model");
const Depot = require("../../stock/models/depot.model");
const StockProduct = require("../../stock/models/product.model");
const Notification = require("../../../models/Notification");
const settingService = require("./purchase-setting.service");

async function generatePurchaseOrderNo() {
  const count = await PurchaseOrder.countDocuments();
  return `BC-${String(count + 1).padStart(4, "0")}`;
}

function computeTotals(lines, vatRate = 19, fodecRate = 1, timbreFiscal = 1) {
  const subtotalHt = lines.reduce((sum, line) => {
    const lineHt = line.quantity * line.unitPrice * (1 - (line.discountRate || 0) / 100);
    return sum + lineHt;
  }, 0);

  const totalFodec = subtotalHt * (fodecRate / 100);
  const totalVat = (subtotalHt + totalFodec) * (vatRate / 100);
  const totalTtc = subtotalHt + totalFodec + totalVat + timbreFiscal;

  return { subtotalHt, vatRate, totalVat, fodecRate, totalFodec, timbreFiscal, totalTtc };
}

const populatePurchaseOrder = (query) =>
  query
    .populate({
      path: "purchaseRequestId",
      populate: { path: "productId", select: "name sku" },
    })
    .populate({
      path: "tenderId",
      populate: [
        { path: "purchaseRequestId", populate: { path: "productId", select: "name sku" } },
        { path: "selectedSupplierId", select: "supplierNo name" },
      ],
    })
    .populate("supplierId", "supplierNo name paymentTerms category")
    .populate("lines.productId", "name sku")
    .populate("createdBy", "name email role");

exports.getAllPurchaseOrders = async () =>
  populatePurchaseOrder(PurchaseOrder.find()).sort({ createdAt: -1 });

exports.getPendingDeliveries = async (userRole, userId) => {
  if (userRole === "DEPOT_MANAGER") {
    const depot = await Depot.findOne({ managerId: userId, status: "ACTIVE" });
    if (!depot) return [];

    // Determine which product types this depot accepts
    let productTypeFilter;
    if (depot.productTypeScope === "MP") {
      productTypeFilter = ["MATIERE_PREMIERE"];
    } else if (depot.productTypeScope === "PF") {
      productTypeFilter = ["PRODUIT_FINI", "SOUS_ENSEMBLE", "COMPOSANT"];
    }
    // MP_PF: no filter — accept all product types

    let orderFilter = { status: "SENT", requestCreatorId: null };

    if (productTypeFilter) {
      const matchingProducts = await StockProduct.find({ type: { $in: productTypeFilter } }).select("_id");
      const productIds = matchingProducts.map((p) => p._id);
      orderFilter["lines.productId"] = { $in: productIds };
    }

    return populatePurchaseOrder(PurchaseOrder.find(orderFilter)).sort({ sentAt: 1 });
  }

  // Supplementary request creators see only their own orders
  if (!userId) return [];
  return populatePurchaseOrder(
    PurchaseOrder.find({ status: "SENT", requestCreatorId: userId })
  ).sort({ sentAt: 1 });
};

exports.getPurchaseOrderById = async (id) => populatePurchaseOrder(PurchaseOrder.findById(id));

exports.createPurchaseOrder = async ({
  purchaseRequestId = null,
  tenderId = null,
  supplierId = null,
  lines = [],
  deliveryTerms = "",
  paymentTerms = "",
  notes = "",
  createdBy = null,
}) => {
  const settings = await settingService.getSettings();
  let resolvedSupplierId = supplierId;
  let resolvedLines = lines;
  let resolvedDepartment = "";
  let resolvedRequestCreatorId = null;

  if (purchaseRequestId) {
    const purchaseRequest = await PurchaseRequest.findById(purchaseRequestId).populate("productId");
    if (!purchaseRequest) {
      throw Object.assign(new Error("Purchase request not found"), { statusCode: 404 });
    }
    if (purchaseRequest.status !== "APPROVED") {
      throw Object.assign(new Error("Only approved purchase requests can generate a purchase order"), {
        statusCode: 400,
      });
    }
    resolvedDepartment = purchaseRequest.department || "STOCK";
    if (!resolvedLines.length) {
      resolvedLines = [
        {
          productId: purchaseRequest.productId._id,
          description: purchaseRequest.reason,
          quantity: purchaseRequest.requestedQuantity,
          unitPrice: Number(purchaseRequest.productId?.purchasePrice || 0),
          discountRate: 0,
          vatRate: settings.defaultVatRate,
        },
      ];
    }
  }

  if (tenderId) {
    const tender = await Tender.findById(tenderId)
      .populate({
        path: "purchaseRequestId",
        populate: { path: "productId", select: "name sku" },
      })
      .populate("supplementaryRequestId", "title quantity unit department createdBy")
      .populate("selectedSupplierId", "supplierNo name");

    if (!tender) {
      throw Object.assign(new Error("Tender not found"), { statusCode: 404 });
    }
    if (tender.status !== "AWARDED" || !tender.selectedSupplierId) {
      throw Object.assign(new Error("Only awarded tenders can generate a purchase order"), {
        statusCode: 400,
      });
    }

    resolvedSupplierId = tender.selectedSupplierId._id;

    if (!resolvedLines.length) {
      const selectedOffer = tender.offers.find((offer) => offer.status === "SELECTED");
      // Fetch the awarded supplier to look up the per-product price
      const awardedSupplier = await Supplier.findById(tender.selectedSupplierId._id);

      if (tender.purchaseRequestId) {
        resolvedDepartment = tender.purchaseRequestId.department || "STOCK";
        const productIdRef = tender.purchaseRequestId.productId._id;
        // Priority: 1) supplier's per-product price, 2) selected offer amount, 3) 0
        let resolvedUnitPrice = 0;
        const productPriceEntry = (awardedSupplier?.productPrices || []).find(
          (p) => String(p.productId) === String(productIdRef)
        );
        if (productPriceEntry && Number(productPriceEntry.priceHt) > 0) {
          resolvedUnitPrice = Number(productPriceEntry.priceHt);
        } else if (selectedOffer && Number(selectedOffer.amountHt) > 0) {
          resolvedUnitPrice = Number(selectedOffer.amountHt);
        }
        resolvedLines = [
          {
            productId: productIdRef,
            description: tender.purchaseRequestId.reason,
            quantity: tender.purchaseRequestId.requestedQuantity || 1,
            unitPrice: resolvedUnitPrice,
            discountRate: 0,
            vatRate: settings.defaultVatRate,
          },
        ];
      } else if (tender.supplementaryRequestId) {
        resolvedDepartment = tender.supplementaryRequestId.department || "";
        resolvedRequestCreatorId = tender.supplementaryRequestId.createdBy || null;
        resolvedLines = [
          {
            productId: null,
            description: tender.supplementaryRequestId.title,
            quantity: tender.supplementaryRequestId.quantity || 1,
            unitPrice: selectedOffer ? selectedOffer.amountHt : 0,
            discountRate: 0,
            vatRate: settings.defaultVatRate,
          },
        ];
      }
    }
  }

  if (!resolvedSupplierId) {
    throw Object.assign(new Error("Supplier is required"), { statusCode: 400 });
  }

  const supplier = await Supplier.findById(resolvedSupplierId);
  if (!supplier) {
    throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
  }
  if (supplier.isBlocked) {
    throw Object.assign(new Error("Blocked suppliers cannot receive purchase orders"), {
      statusCode: 400,
    });
  }
  if (!resolvedLines.length) {
    throw Object.assign(new Error("Add at least one purchase order line"), {
      statusCode: 400,
    });
  }

  // For request-based POs: use supplier's PU if set, otherwise keep product price
  if (purchaseRequestId && supplier.priceHt > 0) {
    resolvedLines = resolvedLines.map((l) => ({ ...l, unitPrice: supplier.priceHt }));
  }

  const totals = computeTotals(
    resolvedLines,
    settings.defaultVatRate,
    settings.defaultFodecRate,
    settings.defaultTimbreFiscal
  );

  const purchaseOrder = await PurchaseOrder.create({
    orderNo: await generatePurchaseOrderNo(),
    purchaseRequestId,
    department: resolvedDepartment,
    tenderId,
    supplierId: resolvedSupplierId,
    lines: resolvedLines,
    deliveryTerms,
    paymentTerms: paymentTerms || supplier.paymentTerms || "",
    notes,
    ...totals,
    createdBy,
    requestCreatorId: resolvedRequestCreatorId,
  });

  // For tender-based POs: update supplier's PU to the negotiated offer price
  if (tenderId && resolvedLines.length > 0 && resolvedLines[0].unitPrice > 0) {
    await Supplier.findByIdAndUpdate(resolvedSupplierId, { priceHt: resolvedLines[0].unitPrice });
  }

  return exports.getPurchaseOrderById(purchaseOrder._id);
};

exports.cancelPurchaseOrder = async (id) => {
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) {
    throw Object.assign(new Error("Purchase order not found"), { statusCode: 404 });
  }
  if (purchaseOrder.status !== "DRAFT") {
    throw Object.assign(new Error("Only draft purchase orders can be cancelled"), { statusCode: 400 });
  }
  purchaseOrder.status = "CANCELLED";
  await purchaseOrder.save();
  return exports.getPurchaseOrderById(purchaseOrder._id);
};

exports.updatePurchaseOrderStatus = async (id, status) => {
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) {
    throw Object.assign(new Error("Purchase order not found"), { statusCode: 404 });
  }

  const currentStatus = purchaseOrder.status;
  const allowedTransitions = {
    DRAFT: ["VALIDATED"],
    VALIDATED: ["SENT"],
    SENT: [],
    RECEIVED: ["CLOSED"],
    CLOSED: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(status)) {
    if (currentStatus === "SENT" && status === "RECEIVED") {
      throw Object.assign(
        new Error("Use a purchase receipt to mark a purchase order as received"),
        { statusCode: 400 }
      );
    }
    throw Object.assign(
      new Error(`Cannot move purchase order from ${currentStatus} to ${status}`),
      { statusCode: 400 }
    );
  }

  purchaseOrder.status = status;
  if (status === "VALIDATED") {
    purchaseOrder.validationLevel += 1;
    purchaseOrder.validatedAt = new Date();
    Notification.create({
      module: "PURCHASE",
      eventType: "PO_VALIDATED",
      title: `Bon de commande ${purchaseOrder.orderNo} validé`,
      message: `Le bon de commande ${purchaseOrder.orderNo} a été validé et est prêt à être envoyé au fournisseur.`,
      metadata: { orderNo: purchaseOrder.orderNo, orderId: purchaseOrder._id },
    }).catch(() => {});
  }
  if (status === "SENT") {
    purchaseOrder.sentAt = new Date();
  }
  if (status === "RECEIVED") {
    purchaseOrder.receivedAt = new Date();
  }
  if (status === "CLOSED") {
    purchaseOrder.closedAt = new Date();
  }

  await purchaseOrder.save();
  return exports.getPurchaseOrderById(purchaseOrder._id);
};
