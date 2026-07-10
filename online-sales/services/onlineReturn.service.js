const path              = require("path");
const fs                = require("fs");
const OnlineReturn      = require("../../models/OnlineReturn");
const OnlineOrder       = require("../../models/OnlineOrder");
const rmaService        = require("./rma.service");
const documentService   = require("./onlineDocument.service");
const Campaign          = require("../../models/Campaign");
const orderService      = require("./onlineOrder.service");

const LOGO_PATH = path.join(__dirname, "../../../frontend/public/logo.png");

async function generateRmaNoticePdf(rma, ret) {
  const PDFDocument = require("pdfkit");
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const red   = "#c8202f";
    const dark  = "#060a0f";
    const gray  = "#6b7280";
    const pageW = doc.page.width;

    // ── Header bar ─────────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 80).fill(dark);

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 40, 15, { height: 50, fit: [120, 50] });
    } else {
      doc.fontSize(16).fillColor(red).font("Helvetica-Bold").text("EMM ERP", 40, 30);
    }

    // Centered title
    doc.fontSize(18).fillColor(red).font("Helvetica-Bold")
       .text("RMA AUTHORIZATION NOTICE", 0, 28, { align: "center", width: pageW });

    doc.fillColor(gray).fontSize(9).font("Helvetica")
       .text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}`,
             0, 52, { align: "center", width: pageW });

    // ── Red accent line ─────────────────────────────────────────────────────
    doc.rect(0, 80, pageW, 3).fill(red);
    doc.moveDown(2);

    // ── Status badge ────────────────────────────────────────────────────────
    const badgeY = 105;
    doc.roundedRect(pageW / 2 - 70, badgeY, 140, 28, 6).fill(red);
    doc.fontSize(12).fillColor("white").font("Helvetica-Bold")
       .text("AUTHORIZED", 0, badgeY + 8, { align: "center", width: pageW });

    doc.moveDown(3);

    // ── Details table ───────────────────────────────────────────────────────
    const startY = 165;
    const col1   = 50;
    const col2   = 220;
    const rowH   = 28;

    const rows = [
      ["RMA Number",     rma.rmaNo],
      ["Return Number",  ret.returnNo],
      ["Customer",       ret.customer?.name || "—"],
      ["Order No",       ret.orderNo],
      ["Product(s)",     ret.productSummary],
      ["Return Reason",  ret.reason || "—"],
      ["Refund Amount",  `${(ret.amount || 0).toFixed(3)} TND`],
      ["Authorized On",  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })],
    ];

    rows.forEach(([label, value], i) => {
      const y   = startY + i * rowH;
      const bg  = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      doc.rect(col1 - 8, y - 4, pageW - 84, rowH).fill(bg);
      doc.fontSize(9).fillColor(gray).font("Helvetica-Bold").text(label.toUpperCase(), col1, y + 4);
      doc.fontSize(10).fillColor(dark).font("Helvetica").text(String(value), col2, y + 4, { width: pageW - col2 - 50 });
    });

    // ── Footer ──────────────────────────────────────────────────────────────
    const footerY = startY + rows.length * rowH + 30;
    doc.rect(col1 - 8, footerY, pageW - 84, 1).fill(red);
    doc.fontSize(8).fillColor(gray).font("Helvetica")
       .text("This document certifies that the above return request has been reviewed and authorized.",
             col1, footerY + 10, { width: pageW - 100 })
       .text("Confidential — EMM Hardware ERP", col1, footerY + 22);

    doc.end();
  });
}

const onlineReturnService = {
  // ── LIST ──────────────────────────────────────────────────────────────────
  async getAll({ search = "", status = "all", page = 1, limit = 50 } = {}) {
    const query = {};
    if (status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { returnNo:        { $regex: search, $options: "i" } },
        { orderNo:         { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { productSummary:  { $regex: search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const [returns, total] = await Promise.all([
      OnlineReturn.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      OnlineReturn.countDocuments(query),
    ]);
    return { returns, total, page, pages: Math.ceil(total / limit) };
  },

  // ── GET ONE ───────────────────────────────────────────────────────────────
  async getById(id) {
    return OnlineReturn.findById(id).lean();
  },

  // ── CREATE ────────────────────────────────────────────────────────────────
async create(data, createdBy = null) {
   const ret = new OnlineReturn({ ...data, createdBy });
    await ret.save();
    // Immediately create a PENDING RMA so it exists throughout the review cycle
    try {
      const onlineOrder = await OnlineOrder.findById(ret.orderId).lean();
      if (onlineOrder?.commercialSalesOrderId) {
        const rmaLines = (onlineOrder.lines || [])
          .filter(l => l.stockProductId)
          .map(l => ({ productId: l.stockProductId, quantity: l.quantity, reason: ret.reason }));

        if (rmaLines.length > 0) {
          const rma = await rmaService.createPending({
            salesOrderId: onlineOrder.commercialSalesOrderId,
            lines:        rmaLines,
            notes:        `Online return ${ret.returnNo} — ${ret.reason}`.trim(),
          });
          ret.commercialRmaId = rma._id;
          ret.commercialRmaNo = rma.rmaNo;
          await ret.save();
        }
      }
    } catch (err) {
      console.error("[OnlineSales] Pending RMA creation failed:", err.message);
    }

    return ret;
  },

  // ── UPDATE STATUS ─────────────────────────────────────────────────────────
  /**
   * Status transitions with full integration side-effects:
   *
   *  pending → approved:
   *    • Creates RMA in Commercial
   *    • Updates campaign spend (promo saving becomes a cost)
   *
   *  approved → refunded:
   *    • Restocks via StockMovement (ENTRY / CUSTOMER_RETURN)
   *    • Writes OUTFLOW finance entry
   *
   *  pending → rejected:
   *    • No stock/finance side-effects
   */
  async updateStatus(id, status, adminNotes = "", userId = null) {
    const ret = await OnlineReturn.findById(id);
    if (!ret) throw Object.assign(new Error("Return not found"), { statusCode: 404 });

    const update = { status };
    if (adminNotes) update.adminNotes = adminNotes;
    if (["approved", "rejected", "refunded"].includes(status)) update.resolvedAt = new Date();

    // ── pending → approved ────────────────────────────────────────────────
    if (status === "approved") {
      const onlineOrder = await OnlineOrder.findById(ret.orderId).lean();

      // 1. COMMERCIAL: authorize existing PENDING RMA (or create + authorize if missing)
      try {
        let rmaId = ret.commercialRmaId;

        if (!rmaId && onlineOrder?.commercialSalesOrderId) {
          const rmaLines = (onlineOrder.lines || [])
            .filter(l => l.stockProductId)
            .map(l => ({ productId: l.stockProductId, quantity: l.quantity, reason: ret.reason }));

          if (rmaLines.length > 0) {
            const rma = await rmaService.createPending({
              salesOrderId: onlineOrder.commercialSalesOrderId,
              lines:        rmaLines,
              notes:        `Online return ${ret.returnNo} — ${ret.reason}. ${adminNotes}`.trim(),
              createdBy:    userId,
            });
            rmaId = rma._id;
            update.commercialRmaId = rma._id;
            update.commercialRmaNo = rma.rmaNo;
          }
        }

        if (rmaId) {
          // Generate the RMA authorization PDF and save it to Online Sales Documents
          const pdfBuffer = await generateRmaNoticePdf(
            { rmaNo: ret.commercialRmaNo || update.commercialRmaNo || "RMA" },
            ret
          );
          const fileName = `RMA_${(ret.commercialRmaNo || update.commercialRmaNo || "notice").replace(/[^a-zA-Z0-9_-]/g, "_")}_Authorization.pdf`;
          const doc = await documentService.upload(
            {
              type:       "Refund Notice (RMA)",
              fileName,
              mimeType:   "application/pdf",
              fileSize:   pdfBuffer.length,
              note:       `Auto-generated RMA authorization for return ${ret.returnNo}`,
              uploadedBy: "System",
            },
            pdfBuffer
          );
          await rmaService.authorizeRma(rmaId, doc._id);
        }
      } catch (err) {
        console.error("[OnlineSales] RMA authorization failed:", err.message);
      }

      // 2. MARKETING: update campaign spend for the promo discount given on this order
      if (onlineOrder?.campaignId && (onlineOrder.subtotal - onlineOrder.totalAmount) > 0) {
        try {
          const discountGiven = onlineOrder.subtotal - onlineOrder.totalAmount;
          await Campaign.findByIdAndUpdate(onlineOrder.campaignId, { $inc: { spend: discountGiven } });
        } catch (err) {
          console.error("[OnlineSales] Campaign spend update failed:", err.message);
        }
      }
    }

    // ── pending → rejected ────────────────────────────────────────────────
    if (status === "rejected" && ret.commercialRmaId) {
      try {
        await rmaService.rejectRma(ret.commercialRmaId);
      } catch (err) {
        console.error("[OnlineSales] RMA rejection failed:", err.message);
      }
    }

    // ── approved → refunded ───────────────────────────────────────────────
    if (status === "refunded") {
      const onlineOrder = await OnlineOrder.findById(ret.orderId).lean();

      if (onlineOrder) {
        // 1. STOCK: restock the returned items
        await orderService._restockForReturn(onlineOrder, ret);

        // 2. FINANCE: outflow entry
        await orderService._recordRefundForReturn(onlineOrder, ret);
      }
    }

    return OnlineReturn.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  },

  // ── UPDATE (general) ─────────────────────────────────────────────────────
  async update(id, data) {
    return OnlineReturn.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  // ── DELETE ───────────────────────────────────────────────────────────────
  async remove(id) {
    return OnlineReturn.findByIdAndDelete(id);
  },

  // ── STATS ─────────────────────────────────────────────────────────────────
  async getStats() {
    const [statusCounts, refundAgg] = await Promise.all([
      OnlineReturn.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
      OnlineReturn.aggregate([
        { $match: { status: "refunded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const byStatus       = { pending: 0, approved: 0, rejected: 0, refunded: 0 };
    const amountByStatus = { pending: 0, approved: 0, rejected: 0, refunded: 0 };
    for (const s of statusCounts) { byStatus[s._id] = s.count; amountByStatus[s._id] = s.amount; }
    const totalRefunded = refundAgg[0]?.total ?? 0;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { total, byStatus, amountByStatus, totalRefunded };
  },
};

module.exports = onlineReturnService;