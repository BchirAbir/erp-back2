const Vehicle = require("../models/vehicle.model");
const DeliveryPlan = require("../models/delivery-plan.model");
const SalesOrder = require("../models/sales-order.model");

exports.getAll = () => Vehicle.find().sort({ createdAt: -1 });
exports.getActive = () => Vehicle.find({ active: true }).sort({ matricule: 1 });
exports.getById = (id) => Vehicle.findById(id);

function calcDurabilityFromPurchaseDate(purchaseDate) {
  const ageDays = (Date.now() - new Date(purchaseDate).getTime()) / 86_400_000;
  if (ageDays < 365) return 50;
  if (ageDays <= 4 * 365) return 100;
  return Math.max(0, 100 - 0.07 * (ageDays - 4 * 365));
}

exports.create = async ({ matricule, capacityKg, capacityPackets, purchaseDate, fuelType, fuelCapacityLiters, notes }) => {
  const exists = await Vehicle.findOne({ matricule: matricule.trim().toUpperCase() });
  if (exists) throw Object.assign(new Error("Matricule already exists"), { statusCode: 409 });
  const durabilityPercent = calcDurabilityFromPurchaseDate(purchaseDate);
  return Vehicle.create({ matricule, capacityKg, capacityPackets, purchaseDate, fuelType, fuelCapacityLiters, durabilityPercent, notes });
};

exports.update = (id, data) =>
  Vehicle.findByIdAndUpdate(id, data, { new: true, runValidators: true });

exports.toggleActive = async (id) => {
  const v = await Vehicle.findById(id);
  if (!v) throw Object.assign(new Error("Vehicle not found"), { statusCode: 404 });
  v.active = !v.active;
  return v.save();
};

exports.getDeliveries = async (id) => {
  const plans = await DeliveryPlan.find({ vehicleId: id })
    .populate("carrierId", "name code")
    .populate({
      path: "orderIds",
      populate: {
        path: "lines.productId",
        select: "name sku",
      },
    })
    .sort({ planDate: -1 });

  if (plans.length > 0) {
    return plans.map((plan) => ({
      _id: String(plan._id),
      planNo: plan.planNo,
      planDate: plan.planDate,
      status: plan.status,
      zone: plan.zone || "",
      livreurName: plan.livreurName || "",
      fuelAddedLiters: Number(plan.fuelAddedLiters || 0),
      distanceKm: plan.distanceKm ?? null,
      orderIds: (plan.orderIds || []).map((order) => ({
        _id: String(order._id),
        orderNo: order.orderNo,
        customerName: order.customerName,
        status: order.status,
        shippingCost: order.shippingCost || 0,
        lines: (order.lines || []).map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount || 0,
          productId: line.productId || null,
        })),
      })),
      carrierId: plan.carrierId || null,
      completedAt: plan.completedAt || null,
    }));
  }

  const orders = await SalesOrder.find({ vehicleId: id })
    .populate("carrierId", "name code")
    .populate({
      path: "lines.productId",
      select: "name sku",
    })
    .sort({ shippedAt: -1 });

  return orders.map((order) => ({
    _id: String(order._id),
    planNo: order.orderNo,
    planDate: order.shippedAt || order.createdAt,
    status: order.status,
    zone: "",
    fuelAddedLiters: 0,
    orderIds: [order],
    carrierId: order.carrierId || null,
    completedAt: order.deliveredAt || null,
  }));
};
