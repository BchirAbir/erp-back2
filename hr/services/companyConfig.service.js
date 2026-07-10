// hr/services/companyConfig.service.js
const CompanyConfig = require("../../models/CompanyConfig");

// Always returns the single config doc, creating it on first access.
exports.get = async () => {
  let cfg = await CompanyConfig.findOne({ key: "default" });
  if (!cfg) cfg = await CompanyConfig.create({ key: "default" });
  return cfg;
};

exports.update = async (data = {}) => {
  const allowed = ["companyName", "establishment", "companyCnss", "companyAddress", "monthlyHours"];
  const update = {};
  for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];

  return CompanyConfig.findOneAndUpdate(
    { key: "default" },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
};
