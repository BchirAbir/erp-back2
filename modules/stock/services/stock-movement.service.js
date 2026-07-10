const StockMovement = require("../models/stock-movement.model");
const stockService = require("./stock.service");
const stockAlertService = require("./stock-alert.service");
const stockEventService = require("./stock-event.service");

const createMovementRecord = async ({
  productId,
  type,
  quantity,
  previousOnHand,
  newOnHand,
  previousReserved,
  newReserved,
  lotRef = "",
  lotMode = null,
  depotId = null,
  sourceModule = "STOCK",
  sourceType = "",
  sourceId = "",
  reference = "",
  reason = "",
  notes = "",
  status = "POSTED",
  createdBy = null,
  approvedBy = null,
  approvedAt = null,
}) => {
  const payload = {
    productId,
    type,
    quantity,
    previousOnHand,
    newOnHand,
    previousReserved,
    newReserved,
    lotRef,
    depotId: depotId || null,
    sourceModule,
    sourceType,
    sourceId,
    reference,
    reason,
    notes,
    status,
    createdBy,
    approvedBy,
    approvedAt,
  };

  // Only add lotMode if it has a valid value
  if (lotMode) {
    payload.lotMode = lotMode;
  }

  return StockMovement.create(payload);
};

exports.createEntry = async ({
  productId,
  quantity,
  lotRef = "",
  lotMode = undefined,
  depotId = null,
  sourceModule = "STOCK",
  sourceType = "MANUAL_ENTRY",
  sourceId = "",
  reference = "",
  reason = "Manual stock entry",
  notes = "",
  createdBy = null,
}) => {
  try {
    if (!quantity || quantity <= 0) {
      throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
    }

    const stockItem = await stockService.getOrCreateStockItem(productId);

    const previousOnHand = stockItem.quantityOnHand;
    const previousReserved = stockItem.quantityReserved;

    stockItem.quantityOnHand += quantity;
    stockItem.lastMovementAt = new Date();
    await stockItem.save();

    const movement = await createMovementRecord({
      productId,
      type: "ENTRY",
      quantity,
      previousOnHand,
      newOnHand: stockItem.quantityOnHand,
      previousReserved,
      newReserved: stockItem.quantityReserved,
      lotRef,
      lotMode,
      depotId,
      sourceModule,
      sourceType,
      sourceId,
      reference,
      reason,
      notes,
      createdBy,
    });

    await stockAlertService.evaluateThreshold({
      productId,
      triggeredByMovementId: movement._id,
    });
    return movement;
  } catch (error) {
    console.error("Error in createEntry:", error);
    throw error;
  }
};

exports.createExit = async ({
  productId,
  quantity,
  lotRef = "",
  lotMode = undefined,
  depotId = null,
  sourceModule = "STOCK",
  sourceType = "MANUAL_EXIT",
  sourceId = "",
  reference = "",
  reason = "Manual stock exit",
  notes = "",
  createdBy = null,
}) => {
  if (!quantity || quantity <= 0) {
    throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
  }

  const stockItem = await stockService.getOrCreateStockItem(productId);
  if (depotId) {
    const depotAvailability = await stockService.getDepotAvailabilityForProduct(productId, depotId);
    if (depotAvailability.quantityAvailable < quantity) {
      throw Object.assign(
        new Error(
          `Insufficient stock in selected depot: available ${depotAvailability.quantityAvailable}, requested ${quantity}`
        ),
        { statusCode: 409 }
      );
    }
  }
  stockService.ensureEnoughAvailableStock(stockItem, quantity);

  const previousOnHand = stockItem.quantityOnHand;
  const previousReserved = stockItem.quantityReserved;

  stockItem.quantityOnHand -= quantity;
  stockItem.lastMovementAt = new Date();
  await stockItem.save();

  const movement = await createMovementRecord({
    productId,
    type: "EXIT",
    quantity,
    previousOnHand,
    newOnHand: stockItem.quantityOnHand,
    previousReserved,
      newReserved: stockItem.quantityReserved,
      lotRef,
      lotMode,
      depotId,
      sourceModule,
      sourceType,
      sourceId,
    reference,
    reason,
    notes,
    createdBy,
  });

  await stockAlertService.evaluateThreshold({
    productId,
    triggeredByMovementId: movement._id,
  });

  await stockEventService.createIntegrationEvent({
    eventType: "STOCK_DEDUCTED",
    aggregateType: "StockMovement",
    aggregateId: movement._id,
    sourceModule,
    sourceId,
    payload: {
      productId,
      quantity,
      type: "EXIT",
    },
  });

  return movement;
};

exports.reserveStock = async ({
  productId,
  quantity,
  depotId = null,
  sourceModule = "COMMERCIAL",
  sourceType = "SALES_ORDER_CONFIRMED",
  sourceId = "",
  reference = "",
  reason = "Stock reserved",
  notes = "",
  createdBy = null,
}) => {
  if (!quantity || quantity <= 0) {
    throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
  }

  const stockItem = await stockService.getOrCreateStockItem(productId);
  if (depotId) {
    const depotAvailability = await stockService.getDepotAvailabilityForProduct(productId, depotId);
    if (depotAvailability.quantityAvailable < quantity) {
      throw Object.assign(
        new Error(
          `Insufficient stock in selected depot: available ${depotAvailability.quantityAvailable}, requested ${quantity}`
        ),
        { statusCode: 409 }
      );
    }
  }
  stockService.ensureEnoughAvailableStock(stockItem, quantity);

  const previousOnHand = stockItem.quantityOnHand;
  const previousReserved = stockItem.quantityReserved;

  stockItem.quantityReserved += quantity;
  stockItem.lastMovementAt = new Date();
  await stockItem.save();

  const movement = await createMovementRecord({
    productId,
    type: "RESERVATION",
    quantity,
    previousOnHand,
    newOnHand: stockItem.quantityOnHand,
    previousReserved,
    newReserved: stockItem.quantityReserved,
    depotId,
    sourceModule,
    sourceType,
    sourceId,
    reference,
    reason,
    notes,
    createdBy,
  });

  await stockEventService.createIntegrationEvent({
    eventType: "STOCK_RESERVED",
    aggregateType: "StockMovement",
    aggregateId: movement._id,
    sourceModule,
    sourceId,
    payload: {
      productId,
      quantity,
      type: "RESERVATION",
    },
  });

  return movement;
};

exports.releaseReservation = async ({
  productId,
  quantity,
  depotId = null,
  sourceModule = "COMMERCIAL",
  sourceType = "SALES_ORDER_RELEASED",
  sourceId = "",
  reference = "",
  reason = "Reserved stock released",
  notes = "",
  createdBy = null,
}) => {
  if (!quantity || quantity <= 0) {
    throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
  }

  const stockItem = await stockService.getOrCreateStockItem(productId);
  if (depotId) {
    const depotAvailability = await stockService.getDepotAvailabilityForProduct(productId, depotId);
    if (depotAvailability.quantityReserved < quantity) {
      throw Object.assign(
        new Error(
          `Insufficient reserved stock in selected depot: reserved ${depotAvailability.quantityReserved}, requested ${quantity}`
        ),
        { statusCode: 409 }
      );
    }
  }
  stockService.ensureEnoughReservedStock(stockItem, quantity);

  const previousOnHand = stockItem.quantityOnHand;
  const previousReserved = stockItem.quantityReserved;

  stockItem.quantityReserved -= quantity;
  stockItem.lastMovementAt = new Date();
  await stockItem.save();

  const movement = await createMovementRecord({
    productId,
    type: "RELEASE",
    quantity,
    previousOnHand,
    newOnHand: stockItem.quantityOnHand,
    previousReserved,
    newReserved: stockItem.quantityReserved,
    depotId,
    sourceModule,
    sourceType,
    sourceId,
    reference,
    reason,
    notes,
    createdBy,
  });

  await stockEventService.createIntegrationEvent({
    eventType: "STOCK_RELEASED",
    aggregateType: "StockMovement",
    aggregateId: movement._id,
    sourceModule,
    sourceId,
    payload: {
      productId,
      quantity,
      type: "RELEASE",
    },
  });

  return movement;
};

exports.deductReservedStock = async ({
  productId,
  quantity,
  lotRef = "",
  lotMode = undefined,
  depotId = null,
  sourceModule = "COMMERCIAL",
  sourceType = "SALES_ORDER_SHIPPED",
  sourceId = "",
  reference = "",
  reason = "Reserved stock deducted",
  notes = "",
  createdBy = null,
}) => {
  if (!quantity || quantity <= 0) {
    throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
  }

  const stockItem = await stockService.getOrCreateStockItem(productId);
  if (depotId) {
    const depotAvailability = await stockService.getDepotAvailabilityForProduct(productId, depotId);
    if (depotAvailability.quantityReserved < quantity) {
      throw Object.assign(
        new Error(
          `Insufficient reserved stock in selected depot: reserved ${depotAvailability.quantityReserved}, requested ${quantity}`
        ),
        { statusCode: 409 }
      );
    }
  }
  stockService.ensureEnoughReservedStock(stockItem, quantity);

  const previousOnHand = stockItem.quantityOnHand;
  const previousReserved = stockItem.quantityReserved;

  stockItem.quantityOnHand -= quantity;
  stockItem.quantityReserved -= quantity;
  stockItem.lastMovementAt = new Date();
  await stockItem.save();

  const movement = await createMovementRecord({
    productId,
    type: "DEDUCTION",
    quantity,
    previousOnHand,
    newOnHand: stockItem.quantityOnHand,
    previousReserved,
    newReserved: stockItem.quantityReserved,
    lotRef,
    lotMode,
    depotId,
    sourceModule,
    sourceType,
    sourceId,
    reference,
    reason,
    notes,
    createdBy,
  });

  await stockAlertService.evaluateThreshold({
    productId,
    triggeredByMovementId: movement._id,
  });

  await stockEventService.createIntegrationEvent({
    eventType: "STOCK_DEDUCTED",
    aggregateType: "StockMovement",
    aggregateId: movement._id,
    sourceModule,
    sourceId,
    payload: {
      productId,
      quantity,
      type: "DEDUCTION",
    },
  });

  return movement;
};

exports.getMovementHistory = async (productId = null, extraFilter = {}) => {
  const filter = { ...(productId ? { productId } : {}), ...extraFilter };
  return StockMovement.find(filter)
    .populate("productId")
    .populate("depotId", "name")
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });
};
