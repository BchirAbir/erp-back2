const path = require("path");
const fs = require("fs");
const purchaseReceiptService = require("../services/purchase-receipt.service");

exports.getAllReceipts = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseReceiptService.getAllReceipts());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getMyReceipts = async (req, reply) => {
  try {
    return reply.code(200).send(await purchaseReceiptService.getMyReceipts(req.user?.id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getReceiptById = async (req, reply) => {
  try {
    const receipt = await purchaseReceiptService.getReceiptById(req.params.id);
    if (!receipt) {
      return reply.code(404).send({ message: "Purchase receipt not found" });
    }
    return reply.code(200).send(receipt);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createReceipt = async (req, reply) => {
  try {
    let body = req.body || {};
    let factureFile = null;

    if (req.isMultipart()) {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.filename) {
            const ext = path.extname(part.filename).toLowerCase();
            const filename = `facture-${Date.now()}${ext}`;
            const dir = path.join(__dirname, "../../../uploads/receipts");
            fs.mkdirSync(dir, { recursive: true });
            const buffer = await part.toBuffer();
            await fs.promises.writeFile(path.join(dir, filename), buffer);
            factureFile = `receipts/${filename}`;
          } else {
            await part.toBuffer();
          }
        } else if (part.fieldname === "data") {
          try { body = JSON.parse(part.value); } catch { /* ignore */ }
        }
      }
    }

    const receipt = await purchaseReceiptService.createReceipt({
      ...body,
      factureFile,
      createdBy: req.user?.id || null,
    });
    return reply.code(201).send(receipt);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
