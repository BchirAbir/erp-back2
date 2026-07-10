const InventoryCount = require("../models/inventory-count.model");
const InventoryCountLine = require("../models/inventory-count-line.model");
const StockItem = require("../models/stock-item.model");
const StockMovement = require("../models/stock-movement.model");
const Product = require("../models/product.model");
const Depot = require("../models/depot.model");
const stockAlertService = require("./stock-alert.service");
const stockEventService = require("./stock-event.service");

const generateInventoryCode = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const t = Date.now().toString().slice(-5);
  return `INV-${y}${m}${d}-${t}`;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

exports.getAllInventories = async ({ userId, role } = {}) => {
  let filter = {};
  if (role === "DEPOT_MANAGER" && userId) {
    const depot = await Depot.findOne({ managerId: userId });
    if (depot) filter.depotId = depot._id;
    else return [];
  }
  return InventoryCount.find(filter)
    .populate("startedBy", "name email role")
    .populate("approvedBy", "name email role")
    .populate("depotId", "name address")
    .populate("rejectionHistory.rejectedBy", "name role")
    .populate("depotResponseHistory.respondedBy", "name role")
    .sort({ createdAt: -1 });
};

exports.getInventoryById = async (id) => {
  const inventory = await InventoryCount.findById(id)
    .populate("startedBy", "name email role")
    .populate("approvedBy", "name email role")
    .populate("depotId", "name address")
    .populate("rejectionHistory.rejectedBy", "name role")
    .populate("depotResponseHistory.respondedBy", "name role");
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  return inventory;
};

exports.getInventoryLines = async (inventoryCountId) => {
  return InventoryCountLine.find({ inventoryCountId })
    .populate("productId")
    .populate("countedBy", "name email role")
    .populate("approvedBy", "name email role")
    .sort({ createdAt: -1 });
};

// ─── Stock Manager: Create & Build ───────────────────────────────────────────

exports.createInventory = async ({ type, notes = "", startedBy = null, depotId = null, dateDebut = null, dateFin = null, year = null }) => {
  if (!depotId) throw Object.assign(new Error("A depot must be selected"), { statusCode: 400 });

  if (type === "PERIODIC") {
    if (!dateDebut || !dateFin) throw Object.assign(new Error("Date début and date fin are required for a periodic inventory"), { statusCode: 400 });
    if (new Date(dateFin) < new Date(dateDebut)) throw Object.assign(new Error("Date fin must be after date début"), { statusCode: 400 });
  }

  if (type === "PERMANENT") {
    if (!year) throw Object.assign(new Error("Year is required for a permanent inventory"), { statusCode: 400 });
    const cutoff = new Date(year, 6, 31); // July 31 of that year (month index 6)
    if (new Date() < cutoff) throw Object.assign(new Error(`Permanent inventory for ${year} is not allowed before July 31, ${year}`), { statusCode: 400 });
  }

  const session = await InventoryCount.create({
    code: generateInventoryCode(),
    type,
    status: "IN_PROGRESS",
    startedBy,
    startedAt: new Date(),
    notes,
    depotId,
    dateDebut: dateDebut ? new Date(dateDebut) : null,
    dateFin:   dateFin   ? new Date(dateFin)   : null,
    year:      year      ? Number(year)         : null,
  });

  if (type === "PERMANENT") {
    const activeProducts = await Product.find({ status: "ACTIVE" }).lean();
    const stockItems = await StockItem.find({
      productId: { $in: activeProducts.map((p) => p._id) },
    }).lean();
    const qtyMap = Object.fromEntries(stockItems.map((si) => [String(si.productId), si.quantityOnHand]));
    const lines = activeProducts.map((p) => ({
      inventoryCountId: session._id,
      productId:        p._id,
      systemQuantity:   qtyMap[String(p._id)] ?? 0,
      countedQuantity:  0,
      status:           "PENDING",
      lotRef:           "",
      notes:            "",
    }));
    if (lines.length > 0) await InventoryCountLine.insertMany(lines);
  }

  return session;
};

exports.addInventoryLine = async ({ inventoryCountId, productId, lotRef = "", notes = "", addedBy = null }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "IN_PROGRESS")
    throw Object.assign(new Error("Lines can only be added while session is IN_PROGRESS"), { statusCode: 400 });

  const product = await Product.findById(productId);
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  const existing = await InventoryCountLine.findOne({ inventoryCountId, productId });
  if (existing) throw Object.assign(new Error("This product already has a line in this session"), { statusCode: 400 });

  const stockItem = await StockItem.findOne({ productId });
  const systemQuantity = stockItem ? stockItem.quantityOnHand : 0;

  return InventoryCountLine.create({
    inventoryCountId,
    productId,
    systemQuantity,
    countedQuantity: 0,
    status: "PENDING",
    lotRef,
    notes,
  });
};

exports.removeInventoryLine = async ({ inventoryCountId, lineId }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "IN_PROGRESS")
    throw Object.assign(new Error("Lines can only be removed while session is IN_PROGRESS"), { statusCode: 400 });
  const line = await InventoryCountLine.findOneAndDelete({ _id: lineId, inventoryCountId });
  if (!line) throw Object.assign(new Error("Line not found"), { statusCode: 404 });
  return { deleted: true };
};

exports.sendToDepot = async (inventoryCountId) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "IN_PROGRESS")
    throw Object.assign(new Error("Session must be IN_PROGRESS to send to depot"), { statusCode: 400 });
  const lineCount = await InventoryCountLine.countDocuments({ inventoryCountId });
  if (lineCount === 0)
    throw Object.assign(new Error("Add at least one line before sending to depot"), { statusCode: 400 });
  inventory.status = "SENT_TO_DEPOT";
  await inventory.save();
  return inventory;
};

// ─── Depot Manager: Physical Count ───────────────────────────────────────────

/**
 * Depot manager submits physical count quantities for all lines.
 * lines = [{ lineId, countedQuantity }]
 */
exports.submitDepotCount = async ({ inventoryCountId, lines, userId }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "SENT_TO_DEPOT")
    throw Object.assign(new Error("Session must be SENT_TO_DEPOT to submit count"), { statusCode: 400 });
  if (inventory.rejectionHistory.length > 0)
    throw Object.assign(new Error("Session was rejected — submit a written response instead"), { statusCode: 400 });

  const existingLines = await InventoryCountLine.find({ inventoryCountId });
  if (existingLines.length === 0)
    throw Object.assign(new Error("No lines to submit"), { statusCode: 400 });

  // Build lookup map
  const lineMap = new Map(existingLines.map((l) => [String(l._id), l]));

  // Validate all lines are covered
  for (const { lineId, countedQuantity } of lines) {
    const line = lineMap.get(String(lineId));
    if (!line) throw Object.assign(new Error(`Line ${lineId} not found in this session`), { statusCode: 400 });
    const qty = Number(countedQuantity);
    if (Number.isNaN(qty) || qty < 0)
      throw Object.assign(new Error(`Invalid countedQuantity for line ${lineId}`), { statusCode: 400 });
  }

  // Apply counted quantities
  for (const { lineId, countedQuantity } of lines) {
    const line = lineMap.get(String(lineId));
    line.countedQuantity = Number(countedQuantity);
    line.status = "COUNTED";
    line.countedBy = userId;
    line.countedAt = new Date();
    await line.save();
  }

  // Transition session
  inventory.status = "PENDING_APPROVAL";
  await inventory.save();

  return inventory;
};

// ─── Stock Manager: Approve or Reject ────────────────────────────────────────

exports.approveInventory = async ({ inventoryCountId, userId }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "PENDING_APPROVAL")
    throw Object.assign(new Error("Session must be PENDING_APPROVAL to approve"), { statusCode: 400 });

  const lines = await InventoryCountLine.find({ inventoryCountId });

  // Create stock adjustments for all lines with variance
  for (const line of lines) {
    if (line.varianceQuantity !== 0) {
      let stockItem = await StockItem.findOne({ productId: line.productId });
      if (!stockItem) {
        stockItem = await StockItem.create({
          productId: line.productId,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          status: "ACTIVE",
        });
      }
      const previousOnHand = stockItem.quantityOnHand;
      const previousReserved = stockItem.quantityReserved;
      stockItem.quantityOnHand = line.countedQuantity;
      stockItem.lastMovementAt = new Date();
      await stockItem.save();

      const movement = await StockMovement.create({
        productId: line.productId,
        type: "ADJUSTMENT",
        quantity: Math.abs(line.varianceQuantity),
        previousOnHand,
        newOnHand: stockItem.quantityOnHand,
        previousReserved,
        newReserved: stockItem.quantityReserved,
        sourceModule: "STOCK",
        sourceType: "INVENTORY_ADJUSTMENT",
        sourceId: String(line._id),
        reference: inventory.code,
        reason: `Inventory count approved — variance: ${line.varianceQuantity > 0 ? "+" : ""}${line.varianceQuantity}`,
        notes: line.notes || "",
        status: "POSTED",
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date(),
      });

      await stockAlertService.evaluateThreshold({
        productId: line.productId,
        triggeredByMovementId: movement._id,
      });
    }

    line.status = "COUNTED"; // keep COUNTED, session close marks it approved
    line.approvedBy = userId;
    line.approvedAt = new Date();
    await line.save();
  }

  inventory.status = "CLOSED";
  inventory.closedAt = new Date();
  inventory.approvedBy = userId;
  inventory.rejectionReason = "";
  await inventory.save();

  // Fire-and-forget integration event
  stockEventService.createIntegrationEvent({
    eventType: "INVENTORY_CLOSED",
    aggregateType: "InventoryCount",
    aggregateId: inventory._id,
    sourceModule: "STOCK",
    sourceId: String(inventory._id),
    payload: { depotId: inventory.depotId, code: inventory.code },
  }).catch((e) => console.error("IntegrationEvent error:", e.message));

  return inventory;
};

// Stock Manager rejects silently — no reason required, depot manager will explain
exports.rejectInventory = async ({ inventoryCountId, userId }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "PENDING_APPROVAL")
    throw Object.assign(new Error("Session must be PENDING_APPROVAL to reject"), { statusCode: 400 });

  // Lines stay COUNTED — depot manager writes an explanation in the next step
  inventory.rejectionHistory.push({ rejectedBy: userId });
  inventory.depotResponse = ""; // clear previous depot response
  inventory.status = "SENT_TO_DEPOT";
  await inventory.save();

  return inventory;
};

/**
 * Depot manager submits a reason explaining their counts after a rejection.
 * Lines stay COUNTED as-is — only a text explanation is needed.
 */
exports.submitDepotResponse = async ({ inventoryCountId, response, userId }) => {
  const inventory = await InventoryCount.findById(inventoryCountId);
  if (!inventory) throw Object.assign(new Error("Inventory session not found"), { statusCode: 404 });
  if (inventory.status !== "SENT_TO_DEPOT")
    throw Object.assign(new Error("Session must be SENT_TO_DEPOT to submit a response"), { statusCode: 400 });
  if (inventory.rejectionHistory.length === 0)
    throw Object.assign(new Error("No rejection to respond to"), { statusCode: 400 });

  const trimmedResponse = response?.trim();
  if (!trimmedResponse) throw Object.assign(new Error("Response is required"), { statusCode: 400 });

  inventory.depotResponse = trimmedResponse;
  inventory.depotResponseHistory.push({ response: trimmedResponse, respondedBy: userId });
  inventory.status = "PENDING_APPROVAL";
  await inventory.save();

  return inventory;
};
