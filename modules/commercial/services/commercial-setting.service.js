const CommercialSetting = require("../models/commercial-setting.model");

const getSingleton = async () => {
  let doc = await CommercialSetting.findOne();
  if (!doc) doc = await CommercialSetting.create({});
  return doc;
};

exports.get = async () => getSingleton();

exports.update = async (data) => {
  const doc = await getSingleton();
  if (data.fuelPricePerLiter !== undefined) {
    const val = Number(data.fuelPricePerLiter);
    if (isNaN(val) || val < 0)
      throw Object.assign(new Error("fuelPricePerLiter must be a non-negative number"), { statusCode: 400 });
    doc.fuelPricePerLiter = val;
  }
  if (data.fuelPer10Km !== undefined) {
    const val = Number(data.fuelPer10Km);
    if (isNaN(val) || val < 0)
      throw Object.assign(new Error("fuelPer10Km must be a non-negative number"), { statusCode: 400 });
    doc.fuelPer10Km = val;
  }
  if (data.fuelTypes !== undefined) {
    if (!Array.isArray(data.fuelTypes))
      throw Object.assign(new Error("fuelTypes must be an array"), { statusCode: 400 });
    doc.fuelTypes = data.fuelTypes
      .filter((t) => t && String(t.name || "").trim())
      .map((t) => ({
        name:                String(t.name).trim(),
        pricePerLiter:       Math.max(0, Number(t.pricePerLiter) || 0),
        consumptionPer100Km: Math.max(0, Number(t.consumptionPer100Km) || 0),
      }));
  }
  for (const field of ["orderPrefix", "planPrefix", "blPrefix"]) {
    if (data[field] !== undefined) {
      const val = String(data[field]).trim().toUpperCase();
      if (!val) throw Object.assign(new Error(`${field} cannot be empty`), { statusCode: 400 });
      doc[field] = val;
    }
  }
  for (const field of ["orderPadding", "planPadding", "blPadding"]) {
    if (data[field] !== undefined) {
      const val = Number(data[field]);
      if (!Number.isInteger(val) || val < 1 || val > 8)
        throw Object.assign(new Error(`${field} must be an integer between 1 and 8`), { statusCode: 400 });
      doc[field] = val;
    }
  }
  await doc.save();
  return doc;
};
