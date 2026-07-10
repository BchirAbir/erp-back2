// online-sales/services/onlineDocument.service.js
const path                = require("path");
const fs                  = require("fs");
const OnlineSalesDocument = require("../../models/OnlineSalesDocument");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/online-sales");

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function saveFile(buffer, originalName) {
  ensureDir();
  const ext    = path.extname(originalName);
  const base   = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const unique = `${base}_${Date.now()}${ext}`;
  const abs    = path.join(UPLOAD_DIR, unique);
  fs.writeFileSync(abs, buffer);
  return `uploads/online-sales/${unique}`;
}

exports.upload = async (data, fileBuffer) => {
  const filePath = saveFile(fileBuffer, data.fileName);
  return OnlineSalesDocument.create({
    type:       data.type,
    fileName:   data.fileName,
    filePath,
    mimeType:   data.mimeType  || "application/pdf",
    fileSize:   data.fileSize  || fileBuffer.length,
    note:       data.note      || "",
    uploadedBy: data.uploadedBy || "",
  });
};

exports.list = (filters = {}) => {
  const query = {};
  if (filters.type) query.type = filters.type;
  return OnlineSalesDocument.find(query).sort({ createdAt: -1 });
};

exports.getById = (id) => OnlineSalesDocument.findById(id);

exports.stream = async (id) => {
  const doc = await OnlineSalesDocument.findById(id);
  if (!doc) throw Object.assign(new Error("Document not found"), { statusCode: 404 });
  const abs = path.join(__dirname, "../../../", doc.filePath);
  if (!fs.existsSync(abs))
    throw Object.assign(new Error("File not found on server"), { statusCode: 404 });
  return { stream: fs.createReadStream(abs), doc };
};

exports.delete = async (id) => {
  const doc = await OnlineSalesDocument.findById(id);
  if (!doc) return null;
  if (doc.filePath) {
    const abs = path.join(__dirname, "../../../", doc.filePath);
    if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
  }
  return OnlineSalesDocument.findByIdAndDelete(id);
};
