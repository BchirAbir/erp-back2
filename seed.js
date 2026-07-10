const mongoose = require("mongoose");
const dotenv   = require("dotenv");
const User     = require("./models/User");

// Stock models
const StockProduct = require("./modules/stock/models/product.model");
const StockItem    = require("./modules/stock/models/stock-item.model");

// Online Sales catalog model
const OnlineProduct = require("./models/OnlineProduct");

dotenv.config();

// ─── Users ────────────────────────────────────────────────────────────────────
const users = [
  { name: "Admin User",          email: "admin@erp.com",       password: "123456", role: "ADMIN",              department: "None",         accountStatus: "approved" },
  { name: "HR Manager",          email: "hr@erp.com",          password: "123456", role: "HR_MANAGER",         department: "HR",           accountStatus: "approved" },
  { name: "Marketing Manager",   email: "marketing@erp.com",   password: "123456", role: "MARKETING_MANAGER",  department: "Marketing",    accountStatus: "approved" },
  { name: "Sales Manager",       email: "sales@erp.com",       password: "123456", role: "SALES_MANAGER",      department: "Online Sales", accountStatus: "approved" },
  { name: "Employee",            email: "employee@erp.com",    password: "123456", role: "EMPLOYEE",           department: "HR",           accountStatus: "approved" },
  { name: "Commercial Manager",  email: "commercial@erp.com",  password: "123456", role: "COMMERCIAL_MANAGER", department: "Commercial",   accountStatus: "approved" },
  { name: "Finance Manager",     email: "finance@erp.com",     password: "123456", role: "FINANCE_MANAGER",    department: "Finance",      accountStatus: "approved" },
  { name: "Stock Manager",       email: "stock@erp.com",       password: "123456", role: "STOCK_MANAGER",      department: "Stock",        accountStatus: "approved" },
  { name: "Purchase Manager",    email: "purchase@erp.com",    password: "123456", role: "PURCHASE_MANAGER",   department: "Purchase",     accountStatus: "approved" },
  { name: "Depot Manager",       email: "depot@erp.com",       password: "123456", role: "DEPOT_MANAGER",      department: "None",         accountStatus: "approved" },
];

// ─── EMM Hardware — Équerres de Chaise (prices × 100) ────────────────────────
// purchasePrice = Prix Gros (wholesale, min 1000 pcs)
// salePrice     = Prix Détail (retail, per unit)
// onlinePrice   = Prix Détail (shown in online catalog)
const brackets = [
  // SKU          Name                              Dimensions        Weight  purchasePrice  salePrice  category        description
  ["EQ-1515",  "Équerre de Chaise 15×15 mm",     "15 x 15 mm",  "8g",    9.000,  11.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 15×15 mm, Poids: 8g."],
  ["EQ-2020",  "Équerre de Chaise 20×20 mm",     "20 x 20 mm",  "12g",  12.000,  15.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 20×20 mm, Poids: 12g."],
  ["EQ-2525",  "Équerre de Chaise 25×25 mm",     "25 x 25 mm",  "18g",  15.000,  20.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 25×25 mm, Poids: 18g."],
  ["EQ-3030",  "Équerre de Chaise 30×30 mm",     "30 x 30 mm",  "25g",  21.000,  30.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 30×30 mm, Poids: 25g."],
  ["EQ-3535",  "Équerre de Chaise 35×35 mm",     "35 x 35 mm",  "35g",  27.000,  40.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 35×35 mm, Poids: 35g."],
  ["EQ-4040",  "Équerre de Chaise 40×40 mm",     "40 x 40 mm",  "45g",  33.000,  50.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 40×40 mm, Poids: 45g."],
  ["EQ-4545",  "Équerre de Chaise 45×45 mm",     "45 x 45 mm",  "58g",  39.000,  61.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 45×45 mm, Poids: 58g."],
  ["EQ-5050",  "Équerre de Chaise 50×50 mm",     "50 x 50 mm",  "72g",  45.000,  71.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 50×50 mm, Poids: 72g."],
  ["EQ-5555",  "Équerre de Chaise 55×55 mm",     "55 x 55 mm",  "88g",  54.000,  81.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 55×55 mm, Poids: 88g."],
  ["EQ-6060",  "Équerre de Chaise 60×60 mm",     "60 x 60 mm", "110g",  66.000,  98.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 60×60 mm, Poids: 110g."],
  ["EQ-6565",  "Équerre de Chaise 65×65 mm",     "65 x 65 mm", "130g",  78.000, 110.000, "Équerres Standard",  "Équerre de chaise en acier galvanisé, finition époxy cuite au four. Dimensions: 65×65 mm, Poids: 130g."],
  // Renforcées (épaisseur 3mm)
  ["EQR-6060", "Équerre Renforcée 60×60 mm",     "60 x 60 mm RENFORCÉ", "120g", 72.000, 105.000, "Équerres Renforcées", "Équerre renforcée épaisseur 3mm, acier galvanisé haute résistance. Dimensions: 60×60 mm, Poids: 120g."],
  ["EQR-6565", "Équerre Renforcée 65×65 mm",     "65 x 65 mm RENFORCÉ", "145g", 87.000, 113.000, "Équerres Renforcées", "Équerre renforcée épaisseur 3mm, acier galvanisé haute résistance. Dimensions: 65×65 mm, Poids: 145g."],

  // ─── Serrures & Corners (Liste TT Amin) ───────────────────────────────────
  ["VER-COUL",   "Verrue à Coulisse",                    "—",                  "—",   14.000,  15.000, "Serrures",  "Verrue à coulisse. Prix gros: 14.000 TND, Prix détail: 15.000 TND."],
  ["SER-HS-ST",  "Serrure Haute Sécurité Sans Tige",     "—",                  "—",   90.000, 105.000, "Serrures",  "Serrure à haute sécurité sans tige."],
  ["SER-HS-AT",  "Serrure Haute Sécurité Avec Tige",     "—",                  "—",  110.000, 125.000, "Serrures",  "Serrure à haute sécurité avec tige."],
  ["COR-9020",   "Corner 90×20×1,3 mm",                  "90 x 20 x 1,3 mm",   "—",   36.500,  38.000, "Corners",   "Corner en acier. Dimensions: 90×20×1,3 mm."],
  ["COR-7020",   "Corner 70×20×1,3 mm",                  "70 x 20 x 1,3 mm",   "—",   30.500,  32.000, "Corners",   "Corner en acier. Dimensions: 70×20×1,3 mm."],
  ["COP-11015",  "Corner Plieller 110×15×1,5 mm",        "110 x 15 x 1,5 mm",  "—",   28.500,  30.000, "Corners Plieller", "Corner plieller. Dimensions: 110×15×1,5 mm."],
  ["COP-9015",   "Corner Plieller 90×15×1,5 mm",         "90 x 15 x 1,5 mm",   "—",   26.500,  28.000, "Corners Plieller", "Corner plieller. Dimensions: 90×15×1,5 mm."],
  ["COP-7015",   "Corner Plieller 70×15×1,5 mm",         "70 x 15 x 1,5 mm",   "—",   24.500,  26.000, "Corners Plieller", "Corner plieller. Dimensions: 70×15×1,5 mm."],
  ["COP-6236",   "Corner Plieller 62×36×1,8 mm",         "62 x 36 x 1,8 mm",   "—",   38.500,  40.000, "Corners Plieller", "Corner plieller. Dimensions: 62×36×1,8 mm."],
  ["COP-13024",  "Corner Plieller 130×24×1,5 mm",        "130 x 24 x 1,5 mm",  "—",   51.500,  53.000, "Corners Plieller", "Corner plieller. Dimensions: 130×24×1,5 mm."],
  ["COP-11024",  "Corner Plieller 110×24×1,5 mm",        "110 x 24 x 1,5 mm",  "—",   41.500,  43.000, "Corners Plieller", "Corner plieller. Dimensions: 110×24×1,5 mm."],
  ["COP-9024",   "Corner Plieller 90×24×1,5 mm",         "90 x 24 x 1,5 mm",   "—",   31.500,  33.000, "Corners Plieller", "Corner plieller. Dimensions: 90×24×1,5 mm."],
];

// ─── Seed function ────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ── 1. Users ──────────────────────────────────────────────────────────────
    await User.deleteMany({});
    console.log("🗑️  Deleted old users");

    for (const u of users) {
      await User.create(u);
      console.log(`🌱 User created: ${u.email}`);
    }
    const salesManager = await User.findOne({ email: "sales@erp.com" });
    console.log("✅ All users seeded!");

    // ── 2. Stock Products ─────────────────────────────────────────────────────
    // Delete only the bracket products we manage (by SKU prefix) so other
    // products added manually via the UI are preserved.
    const bracketSkus = brackets.map(b => b[0]);
    await StockProduct.deleteMany({ sku: { $in: bracketSkus } });
    await StockItem.deleteMany({});   // StockItems are rebuilt below
    await OnlineProduct.deleteMany({ sku: { $in: bracketSkus } });
    console.log("🗑️  Cleared old bracket products");

    for (const [sku, name, dimensions, weight, purchasePrice, salePrice, category, description] of brackets) {
      // 2a. StockProduct — master record used by Commercial, Stock, Production
      const product = await StockProduct.create({
        sku,
        name,
        type:          "PRODUIT_FINI",
        unit:          "pcs",
        isLotTracked:  false,
        status:        "ACTIVE",
        purchasePrice,  // Prix Gros (wholesale)
        salePrice,      // Prix Détail (retail / online)
      });

      // 2b. StockItem — starts at 0, Stock Manager fills quantities later
      await StockItem.create({
        productId:         product._id,
        quantityOnHand:    0,
        quantityReserved:  0,
        quantityAvailable: 0,
        status:            "ACTIVE",
      });

      // 2c. OnlineProduct — catalog listing for the Online Sales module
      await OnlineProduct.create({
        stockProductId:    product._id,
        name,
        sku,
        category,
        description,
        onlinePrice:       salePrice,   // sell at retail price online
        minStockThreshold: 10,          // show as "low-stock" below 10 units
        isVisible:         true,
        tags:              ["équerre", "acier", "galvanisé", dimensions.toLowerCase()],
        createdBy:         salesManager._id,
      });

      console.log(`🔩 Product seeded: ${sku} — ${name}`);
    }

    console.log("✅ All products seeded!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
};

seed();