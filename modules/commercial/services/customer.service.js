const Customer = require("../models/customer.model");
const SalesOrder = require("../models/sales-order.model");

async function computeCustomerTotalOrderAmount(customerId) {
  if (!customerId) return 0;

  const orders = await SalesOrder.find({
    customerId,
    status: { $nin: ["CANCELLED", "RETURNED"] },
  }).select("lines.quantity lines.unitPrice lines.discount");

  return orders.reduce(
    (customerSum, order) =>
      customerSum +
      order.lines.reduce((orderSum, line) => {
        const quantity = Number(line.quantity || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const discount = Number(line.discount || 0);
        return orderSum + quantity * unitPrice * (1 - discount / 100);
      }, 0),
    0
  );
}

exports.syncCustomerTotalOrderAmount = async (customerId) => {
  if (!customerId) return null;

  const totalOrderAmount = await computeCustomerTotalOrderAmount(customerId);
  return Customer.findByIdAndUpdate(
    customerId,
    { totalOrderAmount },
    { new: true, runValidators: true }
  );
};

exports.syncAllCustomerTotals = async () => {
  const customers = await Customer.find().select("_id");
  await Promise.all(
    customers.map((customer) => exports.syncCustomerTotalOrderAmount(customer._id))
  );
};

exports.getAll = async () => {
  await exports.syncAllCustomerTotals();
  return Customer.find().sort({ name: 1 });
};

exports.getActive = async () => {
  await exports.syncAllCustomerTotals();
  return Customer.find({ active: true }).sort({ name: 1 });
};

exports.getById = async (id) => {
  await exports.syncCustomerTotalOrderAmount(id);
  return Customer.findById(id);
};

exports.create = async ({
  name,
  email,
  phone,
  address,
  city,
  continent,
  country,
  state,
  notes,
}) => {
  const normalizedCountry = String(country || "").trim();
  const normalizedState = String(state || "").trim();
  const normalizedContinent =
    String(continent || "").trim() ||
    (normalizedCountry ? "Africa" : "");

  return Customer.create({
    name,
    email,
    phone,
    address,
    city,
    continent: normalizedContinent,
    country: normalizedCountry,
    state: normalizedState,
    notes,
    totalOrderAmount: 0,
  });
};

exports.update = (id, data) =>
  Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });

exports.toggleActive = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  customer.active = !customer.active;
  return customer.save();
};
