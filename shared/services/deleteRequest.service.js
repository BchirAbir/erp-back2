// shared/services/deleteRequest.service.js
const DeleteRequest        = require("../../models/DeleteRequest");
const Document             = require("../../models/Document");
const MarketingDocument    = require("../../models/MarketingDocument");
const OnlineSalesDocument  = require("../../models/OnlineSalesDocument");

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Try to find the document in any collection
async function findDoc(documentId) {
  try {
    const hrDoc = await Document.findById(documentId).select("-fileData");
    if (hrDoc) return { doc: hrDoc, collection: "HR" };
  } catch (e) { console.error("HR findDoc error:", e.message); }

  try {
    const mktDoc = await MarketingDocument.findById(documentId);
    if (mktDoc) return { doc: mktDoc, collection: "Marketing" };
  } catch (e) { console.error("MKT findDoc error:", e.message); }

  try {
    const salesDoc = await OnlineSalesDocument.findById(documentId);
    if (salesDoc) return { doc: salesDoc, collection: "OnlineSales" };
  } catch (e) { console.error("Sales findDoc error:", e.message); }

  console.error("findDoc: document not found in any collection:", documentId);
  return null;
}

// Delete from whichever collection it belongs to
async function deleteDoc(documentId) {
  const found = await findDoc(documentId);
  if (!found) return;
  if (found.collection === "HR") {
    await Document.findByIdAndDelete(documentId);
  } else if (found.collection === "Marketing") {
    await MarketingDocument.findByIdAndDelete(documentId);
  } else if (found.collection === "OnlineSales") {
    // Also remove the physical file
    const fs   = require("fs");
    const path = require("path");
    if (found.doc.filePath) {
      const abs = path.join(__dirname, "../../", found.doc.filePath);
      if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
    }
    await OnlineSalesDocument.findByIdAndDelete(documentId);
  }
}

// Get approved unseen requests for notification bell
exports.getApprovedForUser = (userId) =>
  DeleteRequest.find({ requestedById: userId, status: "Approved", seenAt: null })
    .sort({ approvedAt: -1 });

// Mark notification as seen
exports.markSeen = async (requestId, userId) => {
  const doc = await DeleteRequest.findOne({ _id: requestId, requestedById: userId });
  if (!doc) throw Object.assign(new Error("Not found"), { statusCode: 404 });
  if (!doc.seenAt) { doc.seenAt = new Date(); await doc.save(); }
  return doc;
};

// Request deletion
exports.createRequest = async (documentId, requestedBy, requestedById) => {
  const found = await findDoc(documentId);
  if (!found) throw Object.assign(new Error("Document not found"), { statusCode: 404 });

  const existing = await DeleteRequest.findOne({ documentId, status: "Pending" });
  if (existing) throw Object.assign(
    new Error("A pending delete request already exists for this document"),
    { statusCode: 409 }
  );

  return DeleteRequest.create({
    documentId,
    documentName: found.doc.fileName,
    employeeName: found.doc.employeeName || found.doc.uploadedBy || "",
    department:   found.doc.department   || found.collection,
    requestedBy,
    requestedById,
  });
};

// Admin: get all pending
exports.getPending = () =>
  DeleteRequest.find({ status: "Pending" }).sort({ createdAt: -1 });

// Admin: get all
exports.getAll = () =>
  DeleteRequest.find().sort({ createdAt: -1 });

// Admin: pending count for badge
exports.getPendingCount = () =>
  DeleteRequest.countDocuments({ status: "Pending" });

// Admin: approve → generate code
exports.approve = async (requestId, adminName) => {
  const req = await DeleteRequest.findById(requestId);
  if (!req) throw Object.assign(new Error("Request not found"), { statusCode: 404 });
  if (req.status !== "Pending") throw Object.assign(new Error("Request is not pending"), { statusCode: 400 });

  const code      = genCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  req.status        = "Approved";
  req.code          = code;
  req.codeExpiresAt = expiresAt;
  req.approvedBy    = adminName;
  req.approvedAt    = new Date();
  await req.save();

  return { code, expiresAt, requestId: req._id };
};

// Admin: reject
exports.reject = async (requestId, adminName) => {
  const req = await DeleteRequest.findById(requestId);
  if (!req) throw Object.assign(new Error("Request not found"), { statusCode: 404 });
  req.status     = "Rejected";
  req.approvedBy = adminName;
  req.approvedAt = new Date();
  await req.save();
  return req;
};

// Verify code and delete document
exports.verifyAndDelete = async (documentId, code, userId) => {
  const req = await DeleteRequest.findOne({
    documentId,
    status:        "Approved",
    requestedById: userId,
  }).sort({ approvedAt: -1 });

  if (!req)              throw Object.assign(new Error("No approved request found for this document"), { statusCode: 404 });
  if (req.code !== code) throw Object.assign(new Error("Invalid code"), { statusCode: 400 });
  if (new Date() > req.codeExpiresAt) {
    req.status = "Pending";
    await req.save();
    throw Object.assign(new Error("Code has expired. Please request a new approval."), { statusCode: 400 });
  }

  await deleteDoc(documentId);
  req.status = "Used";
  await req.save();

  await DeleteRequest.updateMany(
    { documentId, status: "Approved", _id: { $ne: req._id } },
    { status: "Used" }
  );

  return { deleted: true };
};

// Check status for a specific document (most recent request)
exports.getRequestForDocument = (documentId, userId) =>
  DeleteRequest.findOne({ documentId, requestedById: userId })
    .sort({ createdAt: -1 });