const CyclicOrder = require("../models/cyclic-order.model");
const SalesOrder = require("../../commercial/models/sales-order.model");
const salesOrderService = require("../../commercial/services/sales-order.service");

const populate = (q) =>
  q
    .populate("customerId", "name email")
    .populate("productId", "name sku unit")
    .populate("createdBy", "name");

exports.getAll = () => populate(CyclicOrder.find().sort({ nextDueDate: 1 }));

exports.getDue = () => {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  return populate(
    CyclicOrder.find({
      active: true,
      nextDueDate: { $lte: horizon },
    }).sort({ nextDueDate: 1 })
  );
};

exports.getById = (id) => populate(CyclicOrder.findById(id));

exports.create = async ({
  customerId,
  customerName,
  productId,
  quantity,
  frequencyDays,
  nextDueDate,
  notes,
  createdBy,
}) => {
  const order = await CyclicOrder.create({
    customerId,
    customerName,
    productId,
    quantity,
    frequencyDays,
    nextDueDate: new Date(nextDueDate),
    notes: notes || "",
    createdBy: createdBy || null,
  });
  return exports.getById(order._id);
};

exports.update = async (id, { quantity, frequencyDays, nextDueDate, notes }) => {
  const order = await CyclicOrder.findById(id);
  if (!order) throw Object.assign(new Error("Cyclic order not found"), { statusCode: 404 });
  if (quantity !== undefined) order.quantity = quantity;
  if (frequencyDays !== undefined) order.frequencyDays = frequencyDays;
  if (nextDueDate !== undefined) order.nextDueDate = new Date(nextDueDate);
  if (notes !== undefined) order.notes = notes;
  await order.save();
  return exports.getById(order._id);
};

exports.toggleActive = async (id) => {
  const order = await CyclicOrder.findById(id);
  if (!order) throw Object.assign(new Error("Cyclic order not found"), { statusCode: 404 });
  order.active = !order.active;
  await order.save();
  return exports.getById(order._id);
};

exports.fire = async (id, createdBy) => {
  const cyclic = await CyclicOrder.findById(id).populate("productId", "name sku unit");
  if (!cyclic) throw Object.assign(new Error("Cyclic order not found"), { statusCode: 404 });
  if (!cyclic.active) throw Object.assign(new Error("Cyclic order is inactive"), { statusCode: 400 });

  const orderNo = await generateSalesOrderNo();
  const salesOrder = await salesOrderService.createOrder({
    orderNo,
    customerId: String(cyclic.customerId),
    customerName: cyclic.customerName,
    source: "RECURRING",
    lines: [
      {
        productId: String(cyclic.productId._id),
        quantity: cyclic.quantity,
      },
    ],
    notes: `Generated from recurring customer order - every ${cyclic.frequencyDays} days`,
    createdBy,
  });

  const nextDue = getNextDueDate(cyclic.nextDueDate, cyclic.frequencyDays, new Date());
  cyclic.lastFiredAt = new Date();
  cyclic.nextDueDate = nextDue;
  await cyclic.save();

  return { cyclicOrder: await exports.getById(id), salesOrder };
};

let autoProcessing = false;

exports.processDueOrders = async () => {
  if (autoProcessing) return { processed: 0, skipped: true };

  autoProcessing = true;
  try {
    const now = new Date();
    const dueOrders = await CyclicOrder.find({
      active: true,
      nextDueDate: { $lte: now },
    }).sort({ nextDueDate: 1 });

    let processed = 0;
    for (const cyclic of dueOrders) {
      try {
        await exports.fire(String(cyclic._id), null);
        processed += 1;
      } catch (_) {
        // Keep the processor running even if one recurring order fails.
      }
    }

    return { processed, skipped: false };
  } finally {
    autoProcessing = false;
  }
};

async function generateSalesOrderNo() {
  const count = await SalesOrder.countDocuments();
  return `ORD-${String(count + 1).padStart(3, "0")}`;
}

function getNextDueDate(currentDueDate, frequencyDays, referenceDate) {
  const nextDue = new Date(currentDueDate);
  do {
    nextDue.setDate(nextDue.getDate() + frequencyDays);
  } while (nextDue <= referenceDate);
  return nextDue;
}
