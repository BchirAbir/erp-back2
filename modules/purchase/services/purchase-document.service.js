const Document  = require("../models/purchase-document.model");
const DeleteOtp = require("../models/purchase-delete-otp.model");

const purchaseDocumentService = {
  async getAll() {
    return Document.find()
      .select("-data")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
  },

  async getById(id) {
    return Document.findById(id).populate("uploadedBy", "name email");
  },

  async create({ originalName, mimeType, size, data, description, uploadedBy }) {
    const buffer = Buffer.from(data, "base64");
    const doc = new Document({ originalName, mimeType, size, data: buffer, description, uploadedBy });
    return doc.save();
  },

  async generateOtp() {
    await DeleteOtp.deleteMany({});
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await new DeleteOtp({ code, expiresAt }).save();
    return { code, expiresAt };
  },

  async validateOtp(code) {
    const otp = await DeleteOtp.findOne({ code, used: false });
    if (!otp) return { valid: false, reason: "Code invalide" };
    if (otp.expiresAt < new Date()) return { valid: false, reason: "Code expiré" };
    otp.used = true;
    await otp.save();
    return { valid: true };
  },

  async delete(id) {
    return Document.findByIdAndDelete(id);
  },

  async getStats() {
    const [total, monthCount, sizeResult] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
      Document.aggregate([{ $group: { _id: null, totalSize: { $sum: "$size" } } }]),
    ]);
    return {
      total,
      monthCount,
      totalSize: sizeResult[0]?.totalSize ?? 0,
    };
  },
};

module.exports = purchaseDocumentService;
