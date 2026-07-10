const Reseller        = require("../../models/Reseller");
const ResellerRequest = require("../../models/ResellerRequest");
const OnlineProduct   = require("../../models/OnlineProduct");
const OnlineOrder     = require("../../models/OnlineOrder");
const onlineOrderService = require("./onlineOrder.service");

// ── Auto-generate email like manager accounts (firstname.lastname@erp.com) ───
async function generateEmail(name) {
  if (!name || typeof name !== "string") throw new Error("Name is required to generate email");
  const parts     = name.trim().toLowerCase().split(/\s+/);
  const base      = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  const sanitized = base.replace(/[^a-z0-9.]/g, "");
  // Use @reseller.emm.com to avoid any collision with internal manager accounts (@erp.com)
  let email       = `${sanitized}@reseller.emm.com`;
  let counter     = 2;
  while (await Reseller.findOne({ email })) {
    email = `${sanitized}${counter}@reseller.emm.com`;
    counter++;
  }
  return email;
}

// ── Auto-generate random 8-char password like manager accounts ───────────────
function generatePassword() {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "x");
}

// ── Helper ────────────────────────────────────────────────────────────────────
function applyDiscount(price, pct) {
  return parseFloat((price * (1 - pct / 100)).toFixed(3));
}

// ── Reseller CRUD ─────────────────────────────────────────────────────────────
const resellerService = {

  // LIST
  async getAll({ search = "", status = "all" } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { email:   { $regex: search, $options: "i" } },
      ];
    }
    return Reseller.find(query).select("-password").sort({ totalRevenue: -1 }).lean();
  },

  // GET ONE
  async getById(id) {
    const reseller  = await Reseller.findById(id).select("-password").lean();
    if (!reseller) return null;
    const requests  = await ResellerRequest.find({ resellerId: id })
      .populate("lines.productId", "name sku onlinePrice")
      .sort({ createdAt: -1 })
      .lean();
    return { reseller, requests };
  },

  // CREATE — generates portal credentials
  async create({ name, phone, company, address, country, taxId,
                 discountPct, creditLimit, paymentTerms, notes }, createdBy = null) {
    // Auto-generate email and password — same pattern as manager accounts
    const email         = await generateEmail(name);
    const plainPassword = generatePassword();

    const reseller = await Reseller.create({
      name, email, phone, company, address, country, taxId,
      discountPct:  discountPct  ?? 0,
      creditLimit:  creditLimit  ?? 0,
      paymentTerms: paymentTerms || "cash",
      notes:        notes        || "",
      password:     plainPassword,   // Reseller model pre-save hook hashes it
      status:       "pending",
      createdBy,
    });

    return {
      ...reseller.toObject(),
      password:      undefined,  // never expose the hash
      plainPassword,             // shown once to the Sales Agent
      email,                     // show the generated email
    };
  },

  // UPDATE
  async update(id, data) {
    // Don't allow direct password update via this route — use resetPassword
    delete data.password;
    return Reseller.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .select("-password");
  },

  // ACTIVATE / SUSPEND / APPROVE
  async setStatus(id, status) {
    return Reseller.findByIdAndUpdate(id, { status }, { new: true }).select("-password");
  },

  // RESET PASSWORD
  async resetPassword(id, newPassword) {
    const reseller = await Reseller.findById(id);
    if (!reseller) throw Object.assign(new Error("Not found"), { statusCode: 404 });
    reseller.password = newPassword;
    await reseller.save();
    return { ok: true };
  },

  // DELETE
  async remove(id) {
    await ResellerRequest.deleteMany({ resellerId: id });
    return Reseller.findByIdAndDelete(id);
  },

  // STATS
  async getStats() {
    const [total, byStatus, topReseller, revenueAgg, pendingRequests] = await Promise.all([
      Reseller.countDocuments(),
      Reseller.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Reseller.findOne().sort({ totalRevenue: -1 }).select("name company totalRevenue totalOrders").lean(),
      Reseller.aggregate([{ $group: { _id: null, total: { $sum: "$totalRevenue" } } }]),
      ResellerRequest.countDocuments({ status: "pending" }),
    ]);
    const statusMap = { pending: 0, active: 0, suspended: 0 };
    for (const s of byStatus) statusMap[s._id] = s.count;
    return {
      total, statusMap,
      topReseller,
      totalResellerRevenue: revenueAgg[0]?.total ?? 0,
      pendingRequests,
    };
  },

  // ── Purchase Requests ──────────────────────────────────────────────────────

  async getAllRequests({ search = "", status = "all", resellerId } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    if (resellerId) query.resellerId = resellerId;
    if (search) query.$or = [{ requestNo: { $regex: search, $options: "i" } }];
    return ResellerRequest.find(query)
      .populate("resellerId", "name company email discountPct")
      .populate("lines.productId", "name sku onlinePrice")
      .sort({ createdAt: -1 })
      .lean();
  },

  async createRequest(resellerId, { lines, notes }) {
    const reseller = await Reseller.findById(resellerId).lean();
    if (!reseller) throw Object.assign(new Error("Reseller not found"), { statusCode: 404 });
    if (reseller.status !== "active")
      throw Object.assign(new Error("Reseller account is not active"), { statusCode: 403 });

    const enrichedLines = await Promise.all(lines.map(async l => {
      const product = await OnlineProduct.findById(l.productId).lean();
      if (!product) throw Object.assign(new Error(`Product ${l.productId} not found`), { statusCode: 404 });
      const listPrice = product.onlinePrice;
      const unitPrice = applyDiscount(listPrice, reseller.discountPct);
      return {
        productId:   product._id,
        productName: product.name,
        sku:         product.sku,
        quantity:    l.quantity,
        unitPrice,
        listPrice,
      };
    }));

    const subtotal    = enrichedLines.reduce((s, l) => s + l.listPrice * l.quantity, 0);
    const totalAmount = enrichedLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

    return ResellerRequest.create({
      resellerId,
      lines: enrichedLines,
      subtotal:    parseFloat(subtotal.toFixed(3)),
      discountPct: reseller.discountPct,
      totalAmount: parseFloat(totalAmount.toFixed(3)),
      notes: notes || "",
    });
  },

async updateRequestStatus(id, status, adminNotes = "", fulfilledBy = null) {    const req = await ResellerRequest.findById(id).populate("resellerId");
    if (!req) throw Object.assign(new Error("Request not found"), { statusCode: 404 });

    req.status    = status;
    req.adminNotes = adminNotes;
    req.resolvedAt = new Date();
    await req.save();

    // On fulfillment: auto-create OnlineOrder + update reseller stats
    if (status === "fulfilled") {
      const reseller = await Reseller.findById(req.resellerId._id || req.resellerId).lean();
      if (reseller) {
        // Build order lines — look up stockProductId from OnlineProduct
        const orderLines = await Promise.all(req.lines.map(async l => {
          const onlineProduct = await OnlineProduct.findById(l.productId).lean();
          return {
            productId:       l.productId,                          // OnlineProduct ref
            stockProductId:  onlineProduct?.stockProductId || null, // StockProduct ref
            productName:     l.productName,
            sku:             l.sku,
            quantity:        l.quantity,
            unitPrice:       l.unitPrice,   // already discounted price
            discountedPrice: l.unitPrice,
          };
        }));

        // Create as PENDING, then route through the standard processing flow so the
        // order reserves stock AND spawns a Commercial SalesOrder (ORD-xxx) — exactly
        // like a normal customer order. This links reseller orders to Commercial and
        // makes returns / RMAs possible for them.
        const newOrder = await OnlineOrder.create({
          // Nested customer object — matches OnlineOrder schema exactly
          customer: {
            name:    reseller.name,
            email:   reseller.email,
            phone:   reseller.phone  || "",
            address: reseller.address || "",
          },
          lines:       orderLines,
          subtotal:    req.subtotal,
          totalAmount: req.totalAmount,
          // Store promo info for display in orders page
          promotionCode:     `RESELLER-${reseller.discountPct}%`,
          promotionDiscount: reseller.discountPct,
          status:            "pending",   // run the full processing flow below
          notes:             `Reseller order — Request ${req.requestNo}`,
          resellerId:        reseller._id,
          isResellerOrder:   true,
          createdBy:         fulfilledBy,
        });

        // Pass it to Commercial (reserve stock + create SalesOrder). Non-blocking:
        // if a product isn't linked to stock the order simply stays pending.
        try {
          await onlineOrderService.updateStatus(newOrder._id, "processing");
        } catch (err) {
          console.error("[Reseller] Failed to pass order to Commercial:", err.message);
        }

        await Reseller.findByIdAndUpdate(reseller._id, {
          $inc: { totalOrders: 1, totalRevenue: req.totalAmount },
          $set: { lastOrderAt: new Date() },
        });
      }
    }

    return req;
  },
};

module.exports = resellerService;