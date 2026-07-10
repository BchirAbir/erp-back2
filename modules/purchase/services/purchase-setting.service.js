const PurchaseSetting = require("../models/purchase-setting.model");

async function getOrCreateSettings() {
  let settings = await PurchaseSetting.findOne();
  if (!settings) {
    settings = await PurchaseSetting.create({});
  } else {
    let touched = false;
    if (settings.defaultFodecRate == null) {
      settings.defaultFodecRate = 1;
      touched = true;
    }
    if (settings.defaultTimbreFiscal == null) {
      settings.defaultTimbreFiscal = 1;
      touched = true;
    }
    if (touched) {
      await settings.save();
    }
  }
  return settings;
}

exports.getSettings = async () => getOrCreateSettings();

exports.updateSettings = async (payload) => {
  const settings = await getOrCreateSettings();

  Object.assign(settings, {
    purchaseOrderPrefix: payload.purchaseOrderPrefix ?? settings.purchaseOrderPrefix,
    purchaseRequestPrefix: payload.purchaseRequestPrefix ?? settings.purchaseRequestPrefix,
    receiptPrefix: payload.receiptPrefix ?? settings.receiptPrefix,
    invoicePrefix: payload.invoicePrefix ?? settings.invoicePrefix,
    tenderPrefix: payload.tenderPrefix ?? settings.tenderPrefix,
    returnPrefix: payload.returnPrefix ?? settings.returnPrefix,
    defaultVatRate:
      typeof payload.defaultVatRate === "number" ? payload.defaultVatRate : settings.defaultVatRate,
    defaultFodecRate:
      typeof payload.defaultFodecRate === "number"
        ? payload.defaultFodecRate
        : settings.defaultFodecRate,
    defaultTimbreFiscal:
      typeof payload.defaultTimbreFiscal === "number"
        ? payload.defaultTimbreFiscal
        : settings.defaultTimbreFiscal,
    defaultCurrency: payload.defaultCurrency ?? settings.defaultCurrency,
    exchangeRateToTnd:
      typeof payload.exchangeRateToTnd === "number"
        ? payload.exchangeRateToTnd
        : settings.exchangeRateToTnd,
    approvalMode: payload.approvalMode ?? settings.approvalMode,
    lowPriorityNeedsApproval:
      typeof payload.lowPriorityNeedsApproval === "boolean"
        ? payload.lowPriorityNeedsApproval
        : settings.lowPriorityNeedsApproval,
    urgentAutoEscalation:
      typeof payload.urgentAutoEscalation === "boolean"
        ? payload.urgentAutoEscalation
        : settings.urgentAutoEscalation,
    purchasedProductCategories:
      payload.purchasedProductCategories ?? settings.purchasedProductCategories,
    unitsOfMeasure: payload.unitsOfMeasure ?? settings.unitsOfMeasure,
  });

  await settings.save();
  return settings;
};
