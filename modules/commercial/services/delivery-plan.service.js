const DeliveryPlan = require("../models/delivery-plan.model");
const SalesOrder = require("../models/sales-order.model");
const Vehicle = require("../models/vehicle.model");
const rmaService = require("./rma.service");
const salesOrderService = require("./sales-order.service");
const commercialSettingService = require("./commercial-setting.service");
const financeService = require("../../finance/services/finance.service");

async function generatePlanNo() {
  const settings = await commercialSettingService.get();
  const prefix  = (settings.planPrefix  || "PLAN").toUpperCase();
  const padding = Number(settings.planPadding || 3);

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped}-(\\d+)$`, "i");

  const plans = await DeliveryPlan.find({ planNo: { $regex: regex } }).select("planNo");

  const max = plans.reduce((m, p) => {
    const match = String(p.planNo || "").match(regex);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

async function generateBLNo() {
  const settings = await commercialSettingService.get();
  const prefix  = (settings.blPrefix  || "BL").toUpperCase();
  const padding = Number(settings.blPadding || 3);

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped}-(\\d+)$`, "i");

  const plans = await DeliveryPlan.find({ blNo: { $regex: regex } }).select("blNo");

  const max = plans.reduce((m, p) => {
    const match = String(p.blNo || "").match(regex);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

const populatePlan = (query) =>
  query
    .populate("carrierId")
    .populate("vehicleId", "matricule capacityPackets capacityKg")
    .populate({
      path: "orderIds",
      populate: { path: "lines.productId", select: "name sku" },
    })
    .populate("returnedOrderIds", "_id orderNo")
    .populate("rmaIds", "rmaNo status orderNo createdAt")
    .populate("createdBy", "name email");

exports.getAll = async () =>
  populatePlan(DeliveryPlan.find()).sort({ planDate: -1 });

exports.getById = async (id) => populatePlan(DeliveryPlan.findById(id));

exports.getDiscoveredZones = async () => {
  const zones = await DeliveryPlan.find({
    planType: "DISCOVER",
    status: { $ne: "CANCELLED" },
    zone: { $ne: "" },
  }).distinct("zone");

  return zones
    .map((zone) => String(zone || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

exports.getUnassignedShippedOrders = async () => {
  const activePlans = await DeliveryPlan.find({
    status: { $in: ["PLANNED", "IN_PROGRESS"] },
  }).select("orderIds");

  const assignedIds = activePlans.flatMap((p) => p.orderIds.map(String));

  return SalesOrder.find({
    status: "PREPARED",
    packingValidatedAt: { $ne: null },
    _id: { $nin: assignedIds },
  })
    .populate("lines.productId", "name sku")
    .populate("carrierId")
    .populate("vehicleId", "matricule capacityPackets capacityKg")
    .sort({ shippedAt: 1 });
};

exports.create = async ({
  planDate,
  vehicleId = null,
  carrierId = null,
  zone = "",
  startDate = null,
  fuelAddedLiters = 0,
  orderIds = [],
  notes = "",
  planType = "SHIPMENT",
  createdBy = null,
}) => {
  const normalizedPlanType = String(planType || "SHIPMENT").toUpperCase();
  const normalizedZone = String(zone || "").trim();
  const normalizedFuelAddedLiters = Math.max(0, Number(fuelAddedLiters || 0));

  if (!["SHIPMENT", "DISCOVER"].includes(normalizedPlanType)) {
    throw Object.assign(new Error("Invalid delivery plan type"), {
      statusCode: 400,
    });
  }

  if (normalizedPlanType === "DISCOVER" && !normalizedZone) {
    throw Object.assign(new Error("Zone is required for discover plans"), {
      statusCode: 400,
    });
  }

  if (normalizedPlanType === "SHIPMENT" && vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId).select("active capacityPackets matricule");
    if (!vehicle || !vehicle.active) {
      throw Object.assign(new Error("Selected vehicle is not available"), {
        statusCode: 400,
      });
    }

    const orders = await SalesOrder.find({ _id: { $in: orderIds } }).select("orderNo lines.quantity");
    const totalPackets = orders.reduce(
      (sum, order) =>
        sum +
        order.lines.reduce(
          (lineSum, line) => lineSum + Math.max(0, Number(line.quantity || 0)),
          0
        ),
      0
    );

    if (
      Number(vehicle.capacityPackets || 0) > 0 &&
      totalPackets > Number(vehicle.capacityPackets || 0)
    ) {
      throw Object.assign(
        new Error(
          `Vehicle ${vehicle.matricule} capacity exceeded: ${vehicle.capacityPackets} units max, ${totalPackets} selected`
        ),
        { statusCode: 400 }
      );
    }
  }

  const planNo = await generatePlanNo();
  const blNo   = await generateBLNo();

  const plan = await DeliveryPlan.create({
    planNo,
    blNo,
    planDate,
    vehicleId: normalizedPlanType === "SHIPMENT" ? vehicleId : null,
    carrierId: normalizedPlanType === "SHIPMENT" ? carrierId : null,
    zone: normalizedZone,
    startDate,
    fuelAddedLiters: normalizedFuelAddedLiters,
    orderIds: normalizedPlanType === "SHIPMENT" ? orderIds : [],
    notes,
    planType: normalizedPlanType,
    createdBy,
  });

  return exports.getById(plan._id);
};

exports.startDelivery = async (id) => {
  const plan = await DeliveryPlan.findById(id);
  if (!plan) {
    throw Object.assign(new Error("Delivery plan not found"), {
      statusCode: 404,
    });
  }
  if (plan.status !== "PLANNED") {
    throw Object.assign(new Error("Only planned deliveries can be started"), {
      statusCode: 400,
    });
  }

  plan.status = "IN_PROGRESS";
  plan.startedAt = new Date();
  await plan.save();

  return exports.getById(plan._id);
};

exports.complete = async (id, { distanceKm } = {}) => {
  const plan = await DeliveryPlan.findById(id);
  if (!plan) {
    throw Object.assign(new Error("Delivery plan not found"), {
      statusCode: 404,
    });
  }
  if (plan.status !== "IN_PROGRESS") {
    throw Object.assign(new Error("Only in-progress deliveries can be completed"), {
      statusCode: 400,
    });
  }

  if (plan.planType === "SHIPMENT") {
    const returnedIds = new Set((plan.returnedOrderIds || []).map(String));
    const relatedOrders = await SalesOrder.find({ _id: { $in: plan.orderIds } }).select(
      "_id orderNo status"
    );

    for (const order of relatedOrders) {
      if (returnedIds.has(String(order._id))) {
        continue;
      }

      if (["DELIVERED", "CLOSED", "CANCELLED"].includes(order.status)) {
        continue;
      }

      if (order.status !== "PREPARED") {
        throw Object.assign(
          new Error(`Order ${order.orderNo} is not ready for delivery completion`),
          { statusCode: 400 }
        );
      }

      await salesOrderService.shipOrder(String(order._id), null, {
        carrierId: plan.carrierId ? String(plan.carrierId) : null,
        vehicleId: plan.vehicleId ? String(plan.vehicleId) : null,
      });
      await salesOrderService.deliverOrder(String(order._id), null);
    }
  }

  plan.status = "COMPLETED";
  plan.completedAt = new Date();
  if (distanceKm !== undefined && distanceKm !== null) {
    plan.distanceKm = Number(distanceKm);
  }
  await plan.save();

  // Record fuel as a finance expense if fuel was added
  if (Number(plan.fuelAddedLiters || 0) > 0 && plan.vehicleId) {
    try {
      const vehicle  = await Vehicle.findById(plan.vehicleId).select("fuelType");
      const settings = await commercialSettingService.get();
      const fuelTypes = settings.fuelTypes || [];
      const match = fuelTypes.find((ft) => ft.name === vehicle?.fuelType);
      if (match && Number(match.pricePerLiter || 0) > 0) {
        await financeService.recordFuelExpense(plan, match.pricePerLiter, match.name);
      }
    } catch (e) {
      console.error("[delivery-plan] fuel expense recording failed:", e.message);
    }
  }

  return exports.getById(plan._id);
};

exports.returnPlan = async (id, userId = null, reason = "", orderId = null) => {
  const plan = await DeliveryPlan.findById(id);
  if (!plan) {
    throw Object.assign(new Error("Delivery plan not found"), {
      statusCode: 404,
    });
  }
  if (plan.status !== "IN_PROGRESS") {
    throw Object.assign(new Error("Only in-progress deliveries can be returned"), {
      statusCode: 400,
    });
  }

  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) {
    throw Object.assign(new Error("Return reason is required"), {
      statusCode: 400,
    });
  }

  const targetOrderId = orderId ? String(orderId) : null;
  const planOrderIds = (plan.orderIds || []).map(String);

  if (targetOrderId && !planOrderIds.includes(targetOrderId)) {
    throw Object.assign(new Error("Selected order does not belong to this delivery plan"), {
      statusCode: 400,
    });
  }

  const returnedOrderIds = [...(plan.returnedOrderIds || []).map(String)];
  if (targetOrderId && returnedOrderIds.includes(targetOrderId)) {
    throw Object.assign(new Error("This order has already been returned"), {
      statusCode: 409,
    });
  }

  const createdRmaIds = [...(plan.rmaIds || [])];

  if (plan.planType === "SHIPMENT") {
    const scopedOrderIds = targetOrderId
      ? [targetOrderId]
      : planOrderIds.filter((value) => !returnedOrderIds.includes(value));

    const relatedOrders = await SalesOrder.find({ _id: { $in: scopedOrderIds } }).select(
      "_id orderNo status lines"
    );

    for (const order of relatedOrders) {
      if (["CLOSED", "CANCELLED"].includes(order.status)) {
        continue;
      }

      if (order.status === "PREPARED") {
        await salesOrderService.shipOrder(String(order._id), userId, {
          carrierId: plan.carrierId ? String(plan.carrierId) : null,
          vehicleId: plan.vehicleId ? String(plan.vehicleId) : null,
        });
        await salesOrderService.deliverOrder(String(order._id), userId);
      } else if (order.status === "SHIPPED") {
        await salesOrderService.deliverOrder(String(order._id), userId);
      } else if (order.status !== "DELIVERED") {
        throw Object.assign(
          new Error(`Order ${order.orderNo} is not ready for return processing`),
          { statusCode: 400 }
        );
      }

      const lines = order.lines
        .map((line) => ({
          productId: String(line.productId),
          quantity: Math.max(0, Number(line.allocatedQuantity || line.quantity || 0)),
          reason: normalizedReason,
        }))
        .filter((line) => line.quantity > 0);

      if (lines.length === 0) {
        continue;
      }

      const rma = await rmaService.create({
        salesOrderId: String(order._id),
        lines,
        notes: `${normalizedReason} - Auto-created from returned delivery plan ${plan.planNo}`,
        createdBy: userId,
      });

      createdRmaIds.push(rma._id);

      if (!returnedOrderIds.includes(String(order._id))) {
        returnedOrderIds.push(String(order._id));
      }
    }
  }

  plan.rmaIds = createdRmaIds;
  plan.returnedOrderIds = returnedOrderIds;

  if (planOrderIds.length > 0 && returnedOrderIds.length >= planOrderIds.length) {
    plan.status = "RETURNED";
    plan.returnedAt = new Date();
  }

  await plan.save();

  return exports.getById(plan._id);
};

exports.cancel = async (id) => {
  const plan = await DeliveryPlan.findById(id);
  if (!plan) {
    throw Object.assign(new Error("Delivery plan not found"), {
      statusCode: 404,
    });
  }
  if (plan.status === "COMPLETED") {
    throw Object.assign(new Error("Completed plans cannot be cancelled"), {
      statusCode: 400,
    });
  }

  plan.status = "CANCELLED";
  plan.cancelledAt = new Date();
  await plan.save();

  return exports.getById(plan._id);
};
