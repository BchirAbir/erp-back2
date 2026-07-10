const ThresholdRule = require("../models/threshold-rule.model");
const StockAlert = require("../models/stock-alert.model");
const Notification = require("../../../models/Notification");
const Product = require("../models/product.model");

exports.evaluateThreshold = async ({ productId, triggeredByMovementId = null }) => {
  const rule = await ThresholdRule.findOne({
    productId,
    isActive: true,
    alertEnabled: true,
  });

  if (!rule) return null;

  const StockItem = require("../models/stock-item.model");
  const stockItem = await StockItem.findOne({ productId });

  if (!stockItem) return null;

  if (stockItem.quantityOnHand < rule.minQuantity) {
    const isOut = stockItem.quantityOnHand === 0;
    const alert = await StockAlert.create({
      productId,
      thresholdRuleId: rule._id,
      type: isOut ? "OUT_OF_STOCK" : "LOW_STOCK",
      title: isOut ? "Out of stock" : "Low stock alert",
      message: `Current stock (${stockItem.quantityOnHand}) is below threshold (${rule.minQuantity}).`,
      currentQuantity: stockItem.quantityOnHand,
      thresholdQuantity: rule.minQuantity,
      status: "OPEN",
      triggeredByMovementId,
    });

    Product.findById(productId).then((product) => {
      const label = product ? product.name : `#${productId}`;
      Notification.create({
        module: "STOCK",
        eventType: isOut ? "OUT_OF_STOCK" : "LOW_STOCK",
        title: isOut ? `Rupture de stock — ${label}` : `Stock faible — ${label}`,
        message: `Stock actuel (${stockItem.quantityOnHand}) en dessous du seuil minimum (${rule.minQuantity}).`,
        metadata: { productId, productName: label, currentQuantity: stockItem.quantityOnHand, minQuantity: rule.minQuantity },
      });
    }).catch(() => {});

    return alert;
  }

  return null;
};