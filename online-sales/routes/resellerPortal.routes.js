// online-sales/routes/resellerPortal.routes.js
const jwt      = require("jsonwebtoken");
const Reseller = require("../../models/Reseller");
const ResellerRequest = require("../../models/ResellerRequest");
const OnlineProduct   = require("../../models/OnlineProduct");
const { loginBody, submitRequestBody } = require("../schemas/resellerPortal.schema");

// ── Reseller JWT guard ────────────────────────────────────────────────────────
const resellerProtect = async (req, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return reply.code(401).send({ message: "No token provided" });
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "reseller")
      return reply.code(403).send({ message: "Not a reseller token" });
    const reseller = await Reseller.findById(decoded.id).select("-password").lean();
    if (!reseller)
      return reply.code(401).send({ message: "Reseller not found" });
    if (reseller.status !== "active")
      return reply.code(403).send({ message: "Account is not active" });
    req.reseller = reseller;
  } catch {
    return reply.code(401).send({ message: "Invalid or expired token" });
  }
};

const auth = { preHandler: [resellerProtect] };

async function resellerPortalRoutes(fastify) {

  // ── Login ─────────────────────────────────────────────────────────────────
  fastify.post("/login", { schema: { body: loginBody } }, async (req, reply) => {
    const { email, password } = req.body;

    const reseller = await Reseller.findOne({ email: email.toLowerCase().trim() });
    if (!reseller)
      return reply.code(401).send({ message: "Invalid credentials" });
    if (reseller.status === "suspended")
      return reply.code(403).send({ message: "Your account has been suspended. Contact EMM Hardware." });
    if (reseller.status === "pending")
      return reply.code(403).send({ message: "Your account is pending approval. Contact EMM Hardware." });

    const ok = await reseller.matchPassword(password);
    if (!ok)
      return reply.code(401).send({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: reseller._id, type: "reseller" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return reply.send({
      token,
      reseller: {
        _id:          reseller._id,
        name:         reseller.name,
        email:        reseller.email,
        company:      reseller.company,
        discountPct:  reseller.discountPct,
        paymentTerms: reseller.paymentTerms,
        totalOrders:  reseller.totalOrders,
        totalRevenue: reseller.totalRevenue,
      },
    });
  });

  // ── Get own profile ───────────────────────────────────────────────────────
  fastify.get("/me", auth, async (req, reply) => {
    return reply.send(req.reseller);
  });

  // ── Browse catalog ────────────────────────────────────────────────────────
  fastify.get("/catalog", auth, async (req, reply) => {
    try {
      const products = await OnlineProduct.find({ isVisible: true })
        .populate("stockProductId", "quantityOnHand lastMovementAt")
        .lean();

      // Apply reseller discount to prices
      const discount = req.reseller.discountPct;
      const enriched = products.map(p => ({
        _id:           p._id,
        name:          p.name,
        sku:           p.sku,
        category:      p.category,
        description:   p.description,
        listPrice:     p.onlinePrice,
        resellerPrice: parseFloat((p.onlinePrice * (1 - discount / 100)).toFixed(3)),
        discountPct:   discount,
        stock:         p.stockProductId?.quantityOnHand ?? 0,
        stockStatus:   !p.stockProductId?.lastMovementAt ? "pending"
                     : (p.stockProductId?.quantityOnHand ?? 0) === 0 ? "out"
                     : (p.stockProductId?.quantityOnHand ?? 0) <= (p.minStockThreshold || 5) ? "low"
                     : "in",
      }));

      return reply.send(enriched);
    } catch (e) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // ── My purchase requests ──────────────────────────────────────────────────
  fastify.get("/my-requests", auth, async (req, reply) => {
    try {
      const requests = await ResellerRequest.find({ resellerId: req.reseller._id })
        .populate("lines.productId", "name sku")
        .sort({ createdAt: -1 })
        .lean();
      return reply.send(requests);
    } catch (e) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // ── Submit a purchase request ─────────────────────────────────────────────
  fastify.post("/request", { ...auth, schema: { body: submitRequestBody } }, async (req, reply) => {
    try {
      const { lines, notes } = req.body;

      const discount = req.reseller.discountPct;
      const enriched = await Promise.all(lines.map(async l => {
        const product = await OnlineProduct.findById(l.productId).lean();
        if (!product) throw new Error(`Product ${l.productId} not found`);
        const listPrice     = product.onlinePrice;
        const resellerPrice = parseFloat((listPrice * (1 - discount / 100)).toFixed(3));
        return {
          productId:   product._id,
          productName: product.name,
          sku:         product.sku,
          quantity:    l.quantity,
          unitPrice:   resellerPrice,
          listPrice,
        };
      }));

      const subtotal    = enriched.reduce((s, l) => s + l.listPrice   * l.quantity, 0);
      const totalAmount = enriched.reduce((s, l) => s + l.unitPrice   * l.quantity, 0);

      const request = await ResellerRequest.create({
        resellerId:  req.reseller._id,
        lines:       enriched,
        subtotal:    parseFloat(subtotal.toFixed(3)),
        discountPct: discount,
        totalAmount: parseFloat(totalAmount.toFixed(3)),
        notes:       notes || "",
      });

      return reply.code(201).send(request);
    } catch (e) {
      return reply.code(400).send({ message: e.message });
    }
  });
}

module.exports = resellerPortalRoutes;