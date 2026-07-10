// fix-missing-devis.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const StockProduct = require("./modules/stock/models/product.model");
require("./modules/commercial/models/customer.model");
require("./models/User");

const SalesOrder = require("./modules/commercial/models/sales-order.model");
const Devis = require("./modules/commercial/models/devis.model");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Get a fallback product for broken references
  const fallback = await StockProduct.findOne();
  if (!fallback) { console.log("No StockProducts — run seed.js first"); process.exit(1); }
  console.log(`Using fallback product: ${fallback.sku} (${fallback._id})`);

  const orders = await SalesOrder.find({}).populate("customerId");
  let created = 0;

  for (const order of orders) {
    try {
      const existing = await Devis.findOne({ salesOrderId: order._id });
      if (existing) { console.log(`⏭️  ${order.orderNo}: already has devis`); continue; }

      const lines = order.lines.map((l) => ({
        productId: l.productId || fallback._id,
        description: l.description || "Product",
        quantity: l.quantity || 1,
        inputUnitPrice: l.unitPrice || 0,
        baseUnitHt: l.unitPrice || 0,
        subtotalHt: (l.unitPrice || 0) * (l.quantity || 1),
        totalVat: 0,
        totalFodec: 0,
        totalBeforeStamp: (l.unitPrice || 0) * (l.quantity || 1),
      }));

      const subtotalHt = lines.reduce((s, l) => s + l.subtotalHt, 0);
      const count = await Devis.countDocuments();

      const devisNo = `FE-${String(count + created + 1).padStart(4, "0")}`;
      await Devis.create({
        devisNo,
        salesOrderId: order._id,
        customerId: order.customerId?._id || order.customerId || null,
        customerName: order.customerName || "Client",
        status: "PENDING",
        pricingMode: order.pricingMode || "HT_BASED",
        applyTva: true,
        applyFodec: true,
        tvaRate: 19,
        fodecRate: 1,
        timbreFiscal: 1,
        issueDate: order.createdAt || new Date(),
        lines,
        subtotalHt,
        totalVat: 0,
        totalFodec: 0,
        totalBeforeStamp: subtotalHt,
        totalTtc: subtotalHt + 1,
      });

      created++;
      console.log(`✅ ${devisNo} created for ${order.orderNo} (${subtotalHt.toFixed(3)} TND)`);
    } catch (e) {
      console.log(`❌ ${order.orderNo}: ${e.message}`);
    }
  }
  console.log(`\nDone — ${created} devis created for ${orders.length} orders`);
  process.exit(0);
})();