const Notification = require("../../../models/Notification");

exports.getAll = async () =>
  Notification.find({ module: "COMMERCIAL" })
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

exports.markRead = async (id) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw Object.assign(new Error("Notification not found"), { statusCode: 404 });
  }
  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  return Notification.findById(notification._id).populate("createdBy", "name email role");
};

exports.createForShipment = async (order, createdBy = null) => {
  await Notification.insertMany([
    {
      module: "COMMERCIAL",
      eventType: "ORDER_SHIPPED",
      title: `Commande ${order.orderNo} expédiée`,
      message: `La commande ${order.orderNo} pour ${order.customerName} a été expédiée et est en transit.`,
      metadata: { orderNo: order.orderNo, customerName: order.customerName, orderId: order._id },
      createdBy,
    },
  ]);
};

exports.createForDelivery = async (order, createdBy = null) => {
  await Notification.insertMany([
    {
      module: "COMMERCIAL",
      eventType: "ORDER_DELIVERED",
      title: `Commande ${order.orderNo} livrée`,
      message: `La commande ${order.orderNo} pour ${order.customerName} a été marquée comme livrée.`,
      metadata: { orderNo: order.orderNo, customerName: order.customerName, orderId: order._id },
      createdBy,
    },
  ]);
};
