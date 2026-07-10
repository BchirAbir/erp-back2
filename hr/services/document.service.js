const path     = require("path");
const fs       = require("fs");
const Document = require("../../models/Document");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/hr");

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
  return `uploads/hr/${unique}`;
}

exports.uploadDocument = async (data, fileBuffer) => {
  const filePath = saveFile(fileBuffer, data.fileName);
  return Document.create({
    employeeId:   data.employeeId,
    employeeName: data.employeeName || "",
    department:   "HR",
    type:         data.type,
    fileName:     data.fileName,
    filePath,
    fileData:     "",
    mimeType:     data.mimeType  || "application/pdf",
    fileSize:     data.fileSize  || fileBuffer.length,
    note:         data.note      || "",
    uploadedBy:   data.uploadedBy || "",
  });
};

exports.getDocuments = (filters = {}) => {
  const query = { department: "HR" }; // always HR only
  if (filters.employeeId) query.employeeId = filters.employeeId;
  if (filters.type)       query.type       = filters.type;
  return Document.find(query)
    .select("-fileData")
    .sort({ createdAt: -1 });
};

exports.getDocumentById = (id) =>
  Document.findById(id).select("-fileData");

exports.streamDocument = async (id) => {
  const doc = await Document.findById(id).select("-fileData");
  if (!doc) throw Object.assign(new Error("Document not found"), { statusCode: 404 });
  const abs = path.join(__dirname, "../../../", doc.filePath);
  if (!fs.existsSync(abs))
    throw Object.assign(new Error("File not found on server"), { statusCode: 404 });
  return { stream: fs.createReadStream(abs), doc };
};

exports.deleteDocument = async (id) => {
  const doc = await Document.findById(id);
  if (!doc) return null;
  if (doc.filePath) {
    const abs = path.join(__dirname, "../../../", doc.filePath);
    if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
  }
  return Document.findByIdAndDelete(id);
};