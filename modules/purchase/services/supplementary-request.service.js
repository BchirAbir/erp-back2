const SupplementaryRequest = require("../models/supplementary-request.model");

async function generateRequestNo() {
  const count = await SupplementaryRequest.countDocuments();
  return `DA-${String(count + 1).padStart(4, "0")}`;
}

const populate = (query) =>
  query
    .populate("createdBy", "name email role")
    .populate("handledBy", "name email role");

exports.getAll = async () =>
  populate(SupplementaryRequest.find()).sort({ createdAt: -1 });

exports.getById = async (id) =>
  populate(SupplementaryRequest.findById(id));

exports.create = async ({
  title,
  category = "AUTRE",
  quantity,
  unit = "pcs",
  estimatedCost = 0,
  department,
  reason,
  priority = "NORMAL",
  notes = "",
  createdBy = null,
}) => {
  const requestNo = await generateRequestNo();
  const request = await SupplementaryRequest.create({
    requestNo,
    title,
    category,
    quantity,
    unit,
    estimatedCost,
    department: String(department || "STOCK").trim().toUpperCase(),
    reason,
    priority,
    notes,
    createdBy,
    status: "DRAFT",
  });
  return exports.getById(request._id);
};

exports.updateStatus = async (id, { status, notes = "" }, userId = null) => {
  const request = await SupplementaryRequest.findById(id);
  if (!request) {
    throw Object.assign(new Error("Demande introuvable"), { statusCode: 404 });
  }

  const allowed = {
    DRAFT: ["SUBMITTED", "REJECTED"],
    SUBMITTED: ["APPROVED", "REJECTED"],
    APPROVED: [],
    REJECTED: [],
  };

  if (!allowed[request.status]?.includes(status)) {
    throw Object.assign(
      new Error(`Transition invalide : ${request.status} → ${status}`),
      { statusCode: 400 }
    );
  }

  request.status = status;
  if (notes) request.notes = notes;
  request.handledBy = userId || request.handledBy;

  if (status === "SUBMITTED") request.submittedAt = new Date();
  if (status === "APPROVED") request.approvedAt = new Date();
  if (status === "REJECTED") request.rejectedAt = new Date();

  await request.save();
  return exports.getById(request._id);
};

exports.delete = async (id) => {
  const request = await SupplementaryRequest.findById(id);
  if (!request) {
    throw Object.assign(new Error("Demande introuvable"), { statusCode: 404 });
  }
  if (request.status !== "DRAFT") {
    throw Object.assign(
      new Error("Seules les demandes en brouillon peuvent être supprimées"),
      { statusCode: 400 }
    );
  }
  await SupplementaryRequest.deleteOne({ _id: id });
};
