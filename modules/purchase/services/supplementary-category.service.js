const SupplementaryCategory = require("../models/supplementary-category.model");

exports.getAll = async () =>
  SupplementaryCategory.find().sort({ label: 1 });

exports.getActive = async () =>
  SupplementaryCategory.find({ isActive: true }).sort({ label: 1 });

exports.getById = async (id) =>
  SupplementaryCategory.findById(id);

exports.create = async ({ name, label, description = "", color = "slate" }) => {
  const existing = await SupplementaryCategory.findOne({
    name: name.trim().toUpperCase(),
  });
  if (existing) {
    throw Object.assign(new Error("Une catégorie avec ce nom existe déjà"), { statusCode: 400 });
  }
  return SupplementaryCategory.create({
    name: name.trim().toUpperCase(),
    label: label.trim(),
    description,
    color,
    isActive: true,
  });
};

exports.update = async (id, { label, description, color, isActive }) => {
  const cat = await SupplementaryCategory.findById(id);
  if (!cat) throw Object.assign(new Error("Catégorie introuvable"), { statusCode: 404 });

  if (label !== undefined) cat.label = label.trim();
  if (description !== undefined) cat.description = description;
  if (color !== undefined) cat.color = color;
  if (isActive !== undefined) cat.isActive = isActive;

  return cat.save();
};

exports.delete = async (id) => {
  const SupplementaryRequest = require("../models/supplementary-request.model");
  const cat = await SupplementaryCategory.findById(id);
  if (!cat) throw Object.assign(new Error("Catégorie introuvable"), { statusCode: 404 });

  const inUse = await SupplementaryRequest.countDocuments({ category: cat.name });
  if (inUse > 0) {
    throw Object.assign(
      new Error(`Cette catégorie est utilisée par ${inUse} demande(s) et ne peut pas être supprimée`),
      { statusCode: 400 }
    );
  }

  await SupplementaryCategory.deleteOne({ _id: id });
};
