const SalesOrder = require("../models/sales-order.model");
const Customer = require("../models/customer.model");
const StockProduct = require("../../stock/models/product.model");
const Depot = require("../../stock/models/depot.model");
const Vehicle = require("../models/vehicle.model");
const Carrier = require("../models/carrier.model");
const stockMovementService = require("../../stock/services/stock-movement.service");
const stockService = require("../../stock/services/stock.service");
const backOrderService = require("./backorder.service");
const notificationService = require("./notification.service");
const RMA = require("../models/rma.model");
const customerInvoiceService = require("./customer-invoice.service");
const devisService = require("./devis.service");
const customerService = require("./customer.service");
const commercialSettingService = require("./commercial-setting.service");

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function suggestedPromiseDate(lines = []) {
  const totalQuantity = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0),
    0
  );

  if (totalQuantity <= 10) return addDays(new Date(), 2);
  if (totalQuantity <= 50) return addDays(new Date(), 4);
  return addDays(new Date(), 7);
}

function promiseDateFromPlanning(plannedEndDate, transitDays = 0) {
  const end = new Date(plannedEndDate);
  if (Number.isNaN(end.getTime())) return null;

  const normalized = new Date(end);
  normalized.setHours(0, 0, 0, 0);
  normalized.setDate(normalized.getDate() + Math.max(0, Number(transitDays) || 0));
  return normalized;
}

async function suggestedTransitDays() {
  const fastestCarrier = await Carrier.findOne({ active: true }).sort({ transitDays: 1, name: 1 }).select("transitDays");
  if (!fastestCarrier) return 2;
  return Math.max(0, Number(fastestCarrier.transitDays || 0));
}

async function generateNextOrderNo() {
  const settings = await commercialSettingService.get();
  const prefix  = (settings.orderPrefix  || "ORD").toUpperCase();
  const padding = Number(settings.orderPadding || 3);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped}-(\\d+)$`);

  const orders = await SalesOrder.find({ orderNo: { $regex: regex } }).select("orderNo").lean();
  const max = orders.reduce((m, o) => {
    const match = String(o.orderNo || "").match(regex);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

async function generateSplitOrderNo(baseOrderNo) {
  const rootOrderNo = String(baseOrderNo).split("/")[0];
  let index = 1;
  let candidate = `${rootOrderNo}/${index}`;
  while (await SalesOrder.exists({ orderNo: candidate })) {
    index += 1;
    candidate = `${rootOrderNo}/${index}`;
  }
  return candidate;
}

// Shared populate spec — used both for query population and in-memory document
// population (so list endpoints don't need a second full collection scan).
const ORDER_POPULATE = [
  { path: "lines.productId" },
  { path: "lines.depotId", select: "name productTypeScope status" },
  { path: "lines.depotPreparedBy", select: "name email role" },
  { path: "createdBy", select: "name email role" },
  { path: "ordonnancedBy", select: "name email role" },
  { path: "preparedBy", select: "name email role" },
  { path: "pickingSlipPrintedBy", select: "name email role" },
  { path: "packingValidatedBy", select: "name email role" },
  { path: "carrierId" },
  { path: "vehicleId", select: "matricule capacityPackets capacityKg" },
  { path: "customerId", select: "name email phone company mf address" },
];

const populateOrder = (query) => query.populate(ORDER_POPULATE);

async function synchronizePreparationState(order) {
  if (!order) return order;

  const depotScopedLines = order.lines.filter(
    (line) => line.depotId && Number(line.quantity || 0) > 0
  );

  if (depotScopedLines.length === 0) {
    return order;
  }

  const allDepotLinesPrepared = depotScopedLines.every((line) => Boolean(line.depotPreparedAt));

  if (allDepotLinesPrepared && order.status === "ORDONNANCED") {
    const preparedDates = depotScopedLines
      .map((line) => line.depotPreparedAt)
      .filter(Boolean)
      .map((value) => new Date(value));
    const latestPreparedAt =
      preparedDates.length > 0
        ? new Date(Math.max(...preparedDates.map((date) => date.getTime())))
        : new Date();
    const preparedBy = depotScopedLines.find((line) => line.depotPreparedBy)?.depotPreparedBy || order.preparedBy;

    order.status = "PREPARED";
    order.preparedAt = order.preparedAt || latestPreparedAt;
    order.preparedBy = order.preparedBy || preparedBy || null;
    await order.save();
  }

  return order;
}

async function getPendingBackOrderForOrder(orderId) {
  const backOrder = await backOrderService.getBySalesOrder(orderId);
  if (backOrder?.status === "PENDING") return backOrder;
  return null;
}

function buildBackOrderLinesFromPlan(order, allocationLines = []) {
  const allocations = new Map(
    allocationLines.map((line) => [
      Number(line.lineIndex),
      (line.allocations || []).reduce(
        (sum, entry) => sum + Math.max(0, Number(entry.allocatedQuantity || 0)),
        0
      ),
    ])
  );

  return order.lines
    .map((line, lineIndex) => {
      const allocatedQuantity = Math.min(
        Number(line.quantity || 0),
        allocations.has(lineIndex)
          ? allocations.get(lineIndex)
          : Number(line.allocatedQuantity || 0)
      );
      const quantityBackordered = Math.max(0, Number(line.quantity || 0) - allocatedQuantity);
      return {
        productId: line.productId,
        quantityOrdered: Number(line.quantity || 0),
        quantityReserved: allocatedQuantity,
        quantityBackordered,
      };
    })
    .filter((line) => line.quantityBackordered > 0);
}

async function getPlannedAllocationsByProduct(excludeOrderId = null) {
  const exclusion =
    Array.isArray(excludeOrderId) && excludeOrderId.length > 0
      ? { _id: { $nin: excludeOrderId } }
      : excludeOrderId
        ? { _id: { $ne: excludeOrderId } }
        : {};
  const orders = await SalesOrder.find({
    status: "ORDONNANCED",
    ...exclusion,
  }).select("lines.productId lines.allocatedQuantity");

  const planned = new Map();
  for (const order of orders) {
    for (const line of order.lines) {
      const productId = String(line.productId);
      const allocated = Number(line.allocatedQuantity || 0);
      planned.set(productId, (planned.get(productId) || 0) + allocated);
    }
  }
  return planned;
}

async function getPlannedAllocationsByProductDepot(excludeOrderId = null) {
  const exclusion =
    Array.isArray(excludeOrderId) && excludeOrderId.length > 0
      ? { _id: { $nin: excludeOrderId } }
      : excludeOrderId
        ? { _id: { $ne: excludeOrderId } }
        : {};
  const orders = await SalesOrder.find({
    status: "ORDONNANCED",
    ...exclusion,
  }).select("lines.productId lines.depotId lines.allocatedQuantity");

  const planned = new Map();
  for (const order of orders) {
    for (const line of order.lines) {
      const allocated = Number(line.allocatedQuantity || 0);
      if (allocated <= 0) continue;
      planned.set(
        availabilityKey(line.productId, line.depotId),
        (planned.get(availabilityKey(line.productId, line.depotId)) || 0) + allocated
      );
    }
  }
  return planned;
}

function availabilityKey(productId, depotId = null) {
  return `${String(productId)}::${depotId ? String(depotId) : "UNASSIGNED"}`;
}

async function applyOrdonnancement(orders, payloads, userId) {
  const lineAllocationsByOrder = new Map(
    payloads.map((entry) => [
      String(entry.orderId || entry._id),
      new Map(
        (entry.lines || []).map((line) => [
          Number(line.lineIndex),
          (line.allocations || []).map((allocation) => ({
            allocatedQuantity: Number(allocation.allocatedQuantity || 0),
            depotId: allocation.depotId ? String(allocation.depotId) : null,
          })),
        ])
      ),
    ])
  );
  const orderIds = orders.map((order) => order._id);
  const plannedAllocations = await getPlannedAllocationsByProduct(orderIds);
  const plannedAllocationsByDepot = await getPlannedAllocationsByProductDepot(orderIds);
  const availabilitySnapshot = await stockService.getDepotAvailability();
  const availableByProductDepot = new Map(
    availabilitySnapshot.rows.map((row) => [
      availabilityKey(row.productId, row.depotId),
      Number(row.quantityAvailable || 0),
    ])
  );
  const requestedByProduct = new Map();
  const requestedByProductDepot = new Map();
  const productsCache = new Map();
  const depotsCache = new Map();

  for (const order of orders) {
    if (!["CONFIRMED", "ORDONNANCED"].includes(order.status)) {
      throw Object.assign(
        new Error("Only confirmed or incomplete ordonnanced orders can be planned here"),
        { statusCode: 400 }
      );
    }

    const payload = payloads.find((entry) => String(entry.orderId || entry._id) === String(order._id)) || {};
    if (!payload.plannedStartDate || !payload.plannedEndDate) {
      throw Object.assign(new Error("Planned start and end dates are required for ordonnancement"), {
        statusCode: 400,
      });
    }
    if (new Date(payload.plannedEndDate) < new Date(payload.plannedStartDate)) {
      throw Object.assign(new Error("Planned end date must be after planned start date"), {
        statusCode: 400,
      });
    }

    const lineAllocations = lineAllocationsByOrder.get(String(order._id)) || new Map();
    for (let lineIndex = 0; lineIndex < order.lines.length; lineIndex += 1) {
      const line = order.lines[lineIndex];
      const productId = String(line.productId);
      const allocations = (lineAllocations.get(lineIndex) || []).filter(
        (allocation) => Number(allocation.allocatedQuantity || 0) > 0
      );
      const totalAllocated = allocations.reduce(
        (sum, allocation) => sum + Math.max(0, Number(allocation.allocatedQuantity || 0)),
        0
      );

      if (totalAllocated > line.quantity) {
        throw Object.assign(
          new Error(`Allocated quantity cannot exceed ordered quantity for product ${productId}`),
          { statusCode: 400 }
        );
      }

      for (const allocation of allocations) {
        const allocatedQuantity = Math.max(0, Number(allocation.allocatedQuantity || 0));
        const depotId = allocation.depotId ? String(allocation.depotId) : null;
        if (allocatedQuantity > 0 && !depotId) {
          throw Object.assign(
            new Error(`Select a depot for allocated quantity on product ${productId}`),
            { statusCode: 400 }
          );
        }

        let depot = depotsCache.get(depotId);
        if (!depot) {
          depot = await Depot.findById(depotId).select("status productTypeScope");
          depotsCache.set(depotId, depot);
        }
        if (!depot || depot.status !== "ACTIVE") {
          throw Object.assign(new Error(`Selected depot is not available for product ${productId}`), {
            statusCode: 400,
          });
        }

        let product = productsCache.get(productId);
        if (!product) {
          product = await StockProduct.findById(productId).select("type");
          productsCache.set(productId, product);
        }
        const isRawMaterial = product?.type === "MATIERE_PREMIERE";
        const allowed =
          depot.productTypeScope === "MP_PF" ||
          (isRawMaterial && depot.productTypeScope === "MP") ||
          (!isRawMaterial && depot.productTypeScope === "PF");

        if (!allowed) {
          throw Object.assign(
            new Error(`Selected depot cannot serve product ${productId} for this product type`),
            { statusCode: 400 }
          );
        }
        requestedByProduct.set(productId, (requestedByProduct.get(productId) || 0) + allocatedQuantity);
        requestedByProductDepot.set(
          availabilityKey(productId, depotId),
          (requestedByProductDepot.get(availabilityKey(productId, depotId)) || 0) + allocatedQuantity
        );
      }
    }
  }

  for (const [productId, totalAllocated] of requestedByProduct.entries()) {
    await stockService.getOrCreateStockItem(productId);
    const availableForPlanning = Math.max(
      0,
      (availableByProductDepot.get(availabilityKey(productId, null)) || 0) +
        Array.from(availableByProductDepot.entries())
          .filter(([key]) => key.startsWith(`${productId}::`) && !key.endsWith("UNASSIGNED"))
          .reduce((sum, [, qty]) => sum + qty, 0) -
        (plannedAllocations.get(productId) || 0)
    );

    if (totalAllocated > availableForPlanning) {
      const product = await StockProduct.findById(productId).select("name sku");
      const label = product ? `${product.name} (${product.sku})` : productId;
      throw Object.assign(
        new Error(
          `Stock insuffisant pour "${label}" : quantité allouée (${totalAllocated}) supérieure au disponible (${availableForPlanning}). Réduisez la quantité ou utilisez « Demander production » pour le reste.`
        ),
        { statusCode: 409 }
      );
    }
  }

  for (const [key, totalAllocated] of requestedByProductDepot.entries()) {
    const [productId, depotToken] = key.split("::");
    const depotId = depotToken === "UNASSIGNED" ? null : depotToken;
    const availableAtDepotForPlanning = Math.max(
      0,
      (availableByProductDepot.get(key) || 0) - (plannedAllocationsByDepot.get(key) || 0)
    );

    if (depotId && totalAllocated > availableAtDepotForPlanning) {
      const product = await StockProduct.findById(productId).select("name sku");
      const label = product ? `${product.name} (${product.sku})` : productId;
      throw Object.assign(
        new Error(
          `Stock insuffisant pour "${label}" dans le dépôt sélectionné : quantité allouée (${totalAllocated}) supérieure au disponible (${availableAtDepotForPlanning}).`
        ),
        { statusCode: 409 }
      );
    }
  }

  for (const order of orders) {
    const wasConfirmedBeforePlanning = order.status === "CONFIRMED";
    const payload = payloads.find((entry) => String(entry.orderId || entry._id) === String(order._id)) || {};
    const lineAllocations = lineAllocationsByOrder.get(String(order._id)) || new Map();
    const readyLines = [];
    const waitingLines = [];

    for (let lineIndex = 0; lineIndex < order.lines.length; lineIndex += 1) {
      const line = order.lines[lineIndex];
      const productId = String(line.productId);
      const allocations = (lineAllocations.get(lineIndex) || []).filter(
        (allocation) => Number(allocation.allocatedQuantity || 0) > 0
      );
      const totalAllocated = allocations.reduce(
        (sum, allocation) => sum + Math.max(0, Number(allocation.allocatedQuantity || 0)),
        0
      );
      const waitingQuantity = Math.max(0, line.quantity - totalAllocated);

      for (const allocation of allocations) {
        const allocatedQuantity = Math.max(0, Number(allocation.allocatedQuantity || 0));
        if (allocatedQuantity <= 0) continue;
        readyLines.push({
          productId: line.productId,
          quantity: allocatedQuantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          allocatedQuantity,
          depotId: allocation.depotId || null,
          plannedProductionQuantity: 0,
          depotPreparedAt: null,
          depotPreparedBy: null,
        });
      }

      if (waitingQuantity > 0) {
        waitingLines.push({
          productId: line.productId,
          quantity: waitingQuantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          allocatedQuantity: 0,
          depotId: null,
          plannedProductionQuantity: waitingQuantity,
          depotPreparedAt: null,
          depotPreparedBy: null,
        });
      }
    }

    // Only the root order gets a devis. Split orders (ORD-002/1, etc.) never get one.
    // Call this BEFORE lines are modified so the devis captures the full original quantities.
    if (readyLines.length > 0 && !order.splitFromOrderId) {
      await devisService.createFromOrder(order._id, userId).catch(() => {});
    }

    if (readyLines.length > 0 && waitingLines.length > 0) {
      await SalesOrder.create({
        orderNo: await generateSplitOrderNo(order.orderNo),
        customerId: order.customerId || null,
        customerName: order.customerName,
        splitFromOrderId: order._id,
        source: order.source || "MANUAL",
        lines: waitingLines,
        notes: [order.notes, `Waiting quantity split from ${order.orderNo}`]
          .filter(Boolean)
          .join(" | "),
        promisedDate: order.promisedDate || null,
        createdBy: userId,
        isUrgent: order.isUrgent || false,
      });
    }

    const reservedItems = [];
    try {
      if (wasConfirmedBeforePlanning && readyLines.length > 0) {
        for (const line of readyLines) {
          const quantityToReserve = Math.max(0, Number(line.allocatedQuantity || 0));
          if (quantityToReserve <= 0) continue;

          await stockMovementService.reserveStock({
            productId: line.productId,
            quantity: quantityToReserve,
            depotId: line.depotId || null,
            sourceModule: "COMMERCIAL",
            sourceType: "SALES_ORDER_CONFIRMED",
            sourceId: String(order._id),
            reference: order.orderNo,
            reason: "Stock reserved after ordonnancement",
            notes: `Order ordonnanced for ${order.customerName}`,
            createdBy: userId,
          });

          reservedItems.push({
            productId: line.productId,
            quantity: quantityToReserve,
            depotId: line.depotId || null,
          });
        }
      }

      if (readyLines.length > 0) {
        order.lines = readyLines;
        order.status = "ORDONNANCED";
        order.plannedStartDate = new Date(payload.plannedStartDate);
        order.plannedEndDate = new Date(payload.plannedEndDate);
        order.promisedDate =
          promiseDateFromPlanning(payload.plannedEndDate, await suggestedTransitDays()) ||
          order.promisedDate;
        order.ordonnancedAt = new Date();
        order.ordonnancedBy = userId;
      } else {
        order.lines = waitingLines;
        order.status = wasConfirmedBeforePlanning ? "CONFIRMED" : "DRAFT";
        order.plannedStartDate = null;
        order.plannedEndDate = null;
        order.ordonnancedAt = null;
        order.ordonnancedBy = null;
      }

      await order.save();
    } catch (error) {
      for (const item of reservedItems) {
        try {
          await stockMovementService.releaseReservation({
            productId: item.productId,
            quantity: item.quantity,
            depotId: item.depotId || null,
            sourceModule: "COMMERCIAL",
            sourceType: "SALES_ORDER_ORDONNANCE_ROLLBACK",
            sourceId: String(order._id),
            reference: order.orderNo,
            reason: "Ordonnancement rollback",
            createdBy: userId,
          });
        } catch (_) {}
      }
      throw error;
    }
  }
}

exports.getAllOrders = async () => {
  const orders = await SalesOrder.find().sort({ createdAt: -1 });
  // Run the preparation-state sync in parallel (each is a no-op unless an order
  // actually transitions to PREPARED, in which case it saves itself).
  await Promise.all(orders.map((order) => synchronizePreparationState(order)));
  // Populate the documents we already have in memory instead of issuing a second
  // full collection scan. Same result shape, one less query over all orders.
  await SalesOrder.populate(orders, ORDER_POPULATE);
  return orders;
};

exports.getOrderById = async (id) => {
  const order = await SalesOrder.findById(id);
  if (!order) return null;
  await synchronizePreparationState(order);
  return populateOrder(SalesOrder.findById(id));
};

const ACTIVE_STATUSES = ["DRAFT", "ORDONNANCED", "CONFIRMED", "PREPARED", "SHIPPED"];

exports.getOrdersPaginated = async ({ page = 1, limit = 20, search = "", status = "ALL" } = {}) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const now = new Date();

  const filter = {};
  if (search && String(search).trim()) {
    const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ orderNo: rx }, { customerName: rx }];
  }
  if (status && status !== "ALL") {
    if (status === "LATE") {
      filter.promisedDate = { $lt: now };
      filter.status = { $in: ACTIVE_STATUSES };
    } else {
      filter.status = status;
    }
  }

  const total = await SalesOrder.countDocuments(filter);
  const orders = await SalesOrder.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize);

  await Promise.all(orders.map((order) => synchronizePreparationState(order)));
  await SalesOrder.populate(orders, ORDER_POPULATE);

  // KPI counts are computed across ALL orders, not just the current page.
  const [totalAll, draft, confirmed, prepared, late] = await Promise.all([
    SalesOrder.countDocuments({}),
    SalesOrder.countDocuments({ status: "DRAFT" }),
    SalesOrder.countDocuments({ status: "CONFIRMED" }),
    SalesOrder.countDocuments({ status: "PREPARED" }),
    SalesOrder.countDocuments({ promisedDate: { $lt: now }, status: { $in: ACTIVE_STATUSES } }),
  ]);

  return {
    items: orders,
    total,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    kpis: { total: totalAll, draft, confirmed, prepared, late },
  };
};

exports.createOrder = async ({
  orderNo,
  customerId = null,
  customerName,
  lines,
  notes = "",
  promisedDate = null,
  createdBy = null,
  source = "MANUAL",
  pricingMode = "HT_BASED",
}) => {
  const finalOrderNo = orderNo
    ? `ORD-${String(orderNo).trim().toUpperCase().replace(/^ORD-/, "")}`
    : await generateNextOrderNo();

  const exists = await SalesOrder.findOne({ orderNo: finalOrderNo });
  if (exists) {
    throw Object.assign(new Error("Order number already exists"), { statusCode: 400 });
  }

  // Auto-fill customerName from Customer document if customerId provided
  let resolvedName = customerName || "";
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
    resolvedName = customer.name;
  }
  if (!resolvedName) throw Object.assign(new Error("Customer is required"), { statusCode: 400 });

  // Validate and auto-fill unit prices from product catalogue
  const TAX_MULT = 1 + 19 / 100 + 1 / 100; // 1.20 — matches default TVA 19% + FODEC 1%
  const resolvedLines = await Promise.all(
    lines.map(async (line) => {
      const product = await StockProduct.findById(line.productId).select("salePrice name");
      if (!product) throw Object.assign(new Error(`Product ${line.productId} not found`), { statusCode: 404 });
      const catalogPriceHt = product.salePrice || 0;
      const inputPrice = line.unitPrice != null ? Number(line.unitPrice) : catalogPriceHt;
      // Convert entered price to HT equivalent for the 50% check
      const inputPriceHt = pricingMode === "TTC_BASED" ? inputPrice / TAX_MULT : inputPrice;
      if (catalogPriceHt > 0 && inputPriceHt < catalogPriceHt * 0.5) {
        throw Object.assign(
          new Error(
            `Prix unitaire pour "${product.name}" trop bas. ` +
            `Le prix HT calculé (${inputPriceHt.toFixed(3)}) est inférieur à 50% du prix catalogue (${catalogPriceHt}).`
          ),
          { statusCode: 400 }
        );
      }
      return { ...line, unitPrice: inputPrice || catalogPriceHt };
    })
  );

  const order = await SalesOrder.create({
    orderNo: finalOrderNo,
    customerId: customerId || null,
    customerName: resolvedName,
    source,
    lines: resolvedLines,
    notes,
    promisedDate: promisedDate ? new Date(promisedDate) : suggestedPromiseDate(resolvedLines),
    createdBy,
    pricingMode: ["HT_BASED", "TTC_BASED"].includes(pricingMode) ? pricingMode : "HT_BASED",
  });

  if (order.customerId) {
    await customerService.syncCustomerTotalOrderAmount(order.customerId);
  }
  await devisService.createFromOrder(order._id, createdBy);

  return exports.getOrderById(order._id);
};

exports.ordonanceOrder = async (
  id,
  { plannedStartDate = null, plannedEndDate = null, lines = [] } = {},
  userId = null
) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  await applyOrdonnancement(
    [order],
    [{ orderId: String(order._id), plannedStartDate, plannedEndDate, lines }],
    userId
  );

  return exports.getOrderById(order._id);
};

exports.ordonanceOrders = async (ordersPayload = [], userId = null) => {
  const orderIds = ordersPayload.map((entry) => String(entry.orderId || "")).filter(Boolean);
  if (orderIds.length === 0) {
    throw Object.assign(new Error("At least one order is required"), { statusCode: 400 });
  }

  const orders = await SalesOrder.find({ _id: { $in: orderIds } });
  if (orders.length !== orderIds.length) {
    throw Object.assign(new Error("One or more sales orders were not found"), { statusCode: 404 });
  }

  const ordersById = new Map(orders.map((order) => [String(order._id), order]));
  const orderedList = orderIds.map((id) => ordersById.get(id));

  await applyOrdonnancement(orderedList, ordersPayload, userId);

  return Promise.all(orderedList.map((order) => exports.getOrderById(order._id)));
};

exports.requestProduction = async (id, payload = {}, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  const backOrderLines = buildBackOrderLinesFromPlan(order, payload.lines || []);
  if (backOrderLines.length === 0) {
    throw Object.assign(new Error("No missing quantity available for production request"), {
      statusCode: 400,
    });
  }

  const backorder = await backOrderService.upsertBackOrder({
    salesOrderId: order._id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    lines: backOrderLines,
    createdBy: userId,
  });

  return backOrderService.requestProduction(String(backorder._id), userId);
};

exports.confirmOrder = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "DRAFT") {
    throw Object.assign(new Error("Only draft orders can be confirmed"), { statusCode: 400 });
  }

  order.status = "CONFIRMED";
  await order.save();

  await devisService.createFromOrder(order._id, userId).catch(() => {});

  return exports.getOrderById(order._id);
};

exports.prepareOrder = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "ORDONNANCED") {
    throw Object.assign(new Error("Only ordonnanced orders can be prepared"), { statusCode: 400 });
  }

  const pendingBackOrder = await getPendingBackOrderForOrder(order._id);
  if (pendingBackOrder) {
    throw Object.assign(
      new Error("Cannot prepare an order while a pending backorder still exists"),
      { statusCode: 400 }
    );
  }

  const actingDepot = userId ? await Depot.findOne({ managerId: userId }).select("_id") : null;
  const depotScopedLines = order.lines.filter((line) => line.depotId);

  if (actingDepot) {
    const targetedLines = order.lines.filter(
      (line) =>
        line.depotId &&
        String(line.depotId) === String(actingDepot._id) &&
        !line.depotPreparedAt
    );

    if (targetedLines.length === 0) {
      throw Object.assign(
        new Error("No order quantity is assigned to your depot or it has already been prepared"),
        { statusCode: 400 }
      );
    }

    const preparedAt = new Date();
    for (const line of targetedLines) {
      line.depotPreparedAt = preparedAt;
      line.depotPreparedBy = userId;
    }

    const allDepotLinesPrepared =
      depotScopedLines.length > 0 &&
      depotScopedLines.every((line) => Boolean(line.depotPreparedAt));

    if (allDepotLinesPrepared) {
      order.status = "PREPARED";
      order.preparedAt = preparedAt;
      order.preparedBy = userId;
    }
  } else {
    const preparedAt = new Date();
    for (const line of order.lines) {
      if (line.depotId && !line.depotPreparedAt) {
        line.depotPreparedAt = preparedAt;
        line.depotPreparedBy = userId;
      }
    }

    order.status = "PREPARED";
    order.preparedAt = preparedAt;
    order.preparedBy = userId;
  }

  await order.save();

  return exports.getOrderById(order._id);
};

exports.markPickingSlipPrinted = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (!["ORDONNANCED", "PREPARED"].includes(order.status)) {
    throw Object.assign(
      new Error("Picking slip can only be printed for ordonnanced or prepared orders"),
      { statusCode: 400 }
    );
  }

  order.pickingSlipPrintedAt = new Date();
  order.pickingSlipPrintedBy = userId;
  await order.save();

  return exports.getOrderById(order._id);
};

exports.validatePacking = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  await synchronizePreparationState(order);

  if (order.status !== "PREPARED") {
    throw Object.assign(new Error("Only prepared orders can be packing-validated"), {
      statusCode: 400,
    });
  }

  if (!order.pickingSlipPrintedAt) {
    throw Object.assign(new Error("Print the picking slip before validating packing"), {
      statusCode: 400,
    });
  }

  order.packingValidatedAt = new Date();
  order.packingValidatedBy = userId;
  await order.save();

  return exports.getOrderById(order._id);
};

exports.cancelOrder = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "DRAFT") {
    throw Object.assign(
      new Error("Only draft orders can be cancelled"),
      { statusCode: 400 }
    );
  }

  // Cancel any associated pending backorder
  const existingBO = await backOrderService.getBySalesOrder(order._id);
  if (existingBO && existingBO.status === "PENDING") {
    await backOrderService.cancelBackOrder(String(existingBO._id));
  }

  for (const line of order.lines) {
    const stockItem = await stockService.getOrCreateStockItem(line.productId);

    // Calculate how much was actually reserved:
    // If a backorder exists, the backordered quantity was never reserved — only
    // (line.quantity - quantityBackordered) was reserved. Works for all backorder
    // states (PENDING, FULFILLED, CANCELLED) and when no backorder exists.
    const backorderLine = existingBO
      ? existingBO.lines.find(
          (bl) => String(bl.productId?._id || bl.productId) === String(line.productId)
        )
      : null;
    const quantityBackordered = backorderLine?.quantityBackordered ?? 0;
    const toRelease = Math.min(
      line.quantity - quantityBackordered,
      stockItem.quantityReserved // never release more than what's actually reserved
    );

    if (toRelease > 0) {
       await stockMovementService.releaseReservation({
        productId: line.productId,
        quantity: toRelease,
        depotId: line.depotId || null,
        sourceModule: "COMMERCIAL",
        sourceType: "SALES_ORDER_RELEASED",
        sourceId: String(order._id),
        reference: order.orderNo,
        reason: "Reservation released after order cancellation",
        notes: `Order cancelled for ${order.customerName}`,
        createdBy: userId,
      });
    }
  }

  order.status = "CANCELLED";
  await order.save();
  if (order.customerId) {
    await customerService.syncCustomerTotalOrderAmount(order.customerId);
  }

  return exports.getOrderById(order._id);
};

exports.markUrgent = async (id, urgent = true) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
    throw Object.assign(new Error("Cannot change urgency of a shipped, delivered or cancelled order"), { statusCode: 400 });
  }

  order.isUrgent = urgent;
  if (urgent) {
    order.shipApproval = {
      status: "PENDING",
      requestedAt: new Date(),
      requestedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: "",
    };
  } else {
    order.shipApproval = {
      status: "NONE",
      requestedAt: null,
      requestedBy: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: "",
    };
  }
  await order.save();
  return exports.getOrderById(order._id);
};

exports.requestShipApproval = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (["SHIPPED", "DELIVERED", "RETURNED", "CLOSED", "CANCELLED"].includes(order.status)) {
    throw Object.assign(new Error("This order can no longer request ship approval"), {
      statusCode: 400,
    });
  }

  if (!order.isUrgent) {
    throw Object.assign(new Error("Order is not flagged as urgent"), { statusCode: 400 });
  }

  if (order.shipApproval?.status === "PENDING") {
    throw Object.assign(new Error("Approval already pending"), { statusCode: 400 });
  }

  order.shipApproval = {
    status: "PENDING",
    requestedAt: new Date(),
    requestedBy: userId,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: "",
  };
  await order.save();
  return exports.getOrderById(order._id);
};

exports.approveShip = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.shipApproval?.status !== "PENDING") {
    throw Object.assign(new Error("No pending approval request for this order"), { statusCode: 400 });
  }

  order.shipApproval.status = "APPROVED";
  order.shipApproval.approvedAt = new Date();
  order.shipApproval.approvedBy = userId;
  await order.save();
  return exports.getOrderById(order._id);
};

exports.rejectShip = async (id, userId = null, reason = "") => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.shipApproval?.status !== "PENDING") {
    throw Object.assign(new Error("No pending approval request for this order"), { statusCode: 400 });
  }

  if (!reason || !reason.trim()) {
    throw Object.assign(new Error("A rejection reason is required"), { statusCode: 400 });
  }

  order.shipApproval.status = "REJECTED";
  order.shipApproval.rejectedAt = new Date();
  order.shipApproval.rejectedBy = userId;
  order.shipApproval.rejectionReason = reason.trim();
  await order.save();
  return exports.getOrderById(order._id);
};

exports.shipOrder = async (id, userId = null, { trackingNumber = "", carrierId = null, vehicleId = null, shippingCost = 0, shipmentAddress = "" } = {}) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "PREPARED") {
    throw Object.assign(new Error("Only prepared orders can be shipped"), { statusCode: 400 });
  }

  if (!order.packingValidatedAt) {
    throw Object.assign(new Error("Only packed orders can be shipped"), { statusCode: 400 });
  }

  const pendingBackOrder = await getPendingBackOrderForOrder(order._id);
  if (pendingBackOrder) {
    throw Object.assign(
      new Error("Cannot ship an order while a pending backorder still exists"),
      { statusCode: 400 }
    );
  }

  // Urgent orders require prior approval
  if (order.isUrgent && order.shipApproval?.status !== "APPROVED") {
    throw Object.assign(
      new Error("Urgent orders require shipment approval before shipping"),
      { statusCode: 403 }
    );
  }

  // Vehicle capacity check
  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw Object.assign(new Error("Vehicle not found"), { statusCode: 404 });
    if (!vehicle.active) throw Object.assign(new Error("Vehicle is not active"), { statusCode: 400 });
    const totalQty = order.lines.reduce((sum, l) => sum + l.quantity, 0);
    if (vehicle.capacityPackets > 0 && totalQty > vehicle.capacityPackets) {
      throw Object.assign(
        new Error(`Order total (${totalQty} packets) exceeds vehicle capacity (${vehicle.capacityPackets} packets)`),
        { statusCode: 400 }
      );
    }
    // Use vehicle matricule as tracking number if none provided
    if (!trackingNumber) trackingNumber = vehicle.matricule;
  }

  for (const line of order.lines) {
    const quantityToShip = Math.min(Number(line.quantity || 0), Number(line.allocatedQuantity || 0));
    if (quantityToShip <= 0) continue;

    await stockMovementService.deductReservedStock({
      productId: line.productId,
      quantity: quantityToShip,
      depotId: line.depotId || null,
      sourceModule: "COMMERCIAL",
      sourceType: "SALES_ORDER_SHIPPED",
      sourceId: String(order._id),
      reference: order.orderNo,
      reason: "Reserved stock deducted after shipping",
      notes: `Order shipped for ${order.customerName}`,
      createdBy: userId,
    });
  }

  order.status = "SHIPPED";
  order.shippedAt = new Date();
  if (trackingNumber) order.trackingNumber = trackingNumber.trim();
  if (carrierId) order.carrierId = carrierId;
  if (carrierId && order.plannedEndDate) {
    const carrier = await Carrier.findById(carrierId).select("transitDays");
    if (carrier) {
      order.promisedDate =
        promiseDateFromPlanning(order.plannedEndDate, carrier.transitDays) || order.promisedDate;
    }
  }
  if (vehicleId) order.vehicleId = vehicleId;
  if (shipmentAddress) order.shipmentAddress = shipmentAddress.trim();
  order.shippingCost = shippingCost || 0;
  await order.save();
  await notificationService.createForShipment(order, userId);

  return exports.getOrderById(order._id);
};

exports.deliverOrder = async (id, userId = null) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "SHIPPED") {
    throw Object.assign(new Error("Only shipped orders can be marked as delivered"), {
      statusCode: 400,
    });
  }

  order.status = "DELIVERED";
  order.deliveredAt = new Date();
  await order.save();
  await notificationService.createForDelivery(order, userId);

  return exports.getOrderById(order._id);
};

exports.closeOrder = async (id) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status === "RETURNED") {
    const openRmas = await RMA.countDocuments({
      salesOrderId: order._id,
      status: { $ne: "CLOSED" },
    });
    if (openRmas > 0) {
      throw Object.assign(
        new Error("Close the related return request before closing this order"),
        { statusCode: 400 }
      );
    }
  } else if (order.status !== "DELIVERED") {
    throw Object.assign(new Error("Only delivered or returned orders can be closed"), { statusCode: 400 });
  }

  order.status = "CLOSED";
  order.closedAt = new Date();
  await order.save();

  return exports.getOrderById(order._id);
};

exports.markReturned = async (id) => {
  const order = await SalesOrder.findById(id);
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  if (order.status !== "DELIVERED") {
    throw Object.assign(new Error("Only delivered orders can be marked as returned"), { statusCode: 400 });
  }

  const relatedRmas = await RMA.find({ salesOrderId: order._id }).select("status");
  if (relatedRmas.length === 0) {
    throw Object.assign(new Error("Create and close the return request before marking this order as returned"), {
      statusCode: 400,
    });
  }

  if (!relatedRmas.every((rma) => rma.status === "CLOSED")) {
    throw Object.assign(new Error("Close the related return request before marking this order as returned"), {
      statusCode: 400,
    });
  }

  order.status = "RETURNED";
  await order.save();
  if (order.customerId) {
    await customerService.syncCustomerTotalOrderAmount(order.customerId);
  }

  return exports.getOrderById(order._id);
};

exports.reorder = async (id, userId = null) => {
  const order = await SalesOrder.findById(id).populate("lines.productId");
  if (!order) {
    throw Object.assign(new Error("Sales order not found"), { statusCode: 404 });
  }

  const lines = order.lines.map((line) => ({
    productId: String(line.productId?._id || line.productId),
    quantity: Number(line.quantity || 0),
    unitPrice: Number(line.unitPrice || 0),
    discount: Number(line.discount || 0),
  }));

  return exports.createOrder({
    customerId: order.customerId ? String(order.customerId) : null,
    customerName: order.customerName,
    lines,
    promisedDate: suggestedPromiseDate(lines),
    createdBy: userId,
    source: "MANUAL",
  });
};