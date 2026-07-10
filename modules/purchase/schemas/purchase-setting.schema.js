const updatePurchaseSettingsBody = {
  type: "object",
  properties: {
    purchaseOrderPrefix: { type: "string" },
    purchaseRequestPrefix: { type: "string" },
    receiptPrefix: { type: "string" },
    invoicePrefix: { type: "string" },
    tenderPrefix: { type: "string" },
    returnPrefix: { type: "string" },
    defaultVatRate: { type: "number", minimum: 0, maximum: 100 },
    defaultFodecRate: { type: "number", minimum: 0, maximum: 100 },
    defaultTimbreFiscal: { type: "number", minimum: 0 },
    defaultCurrency: { type: "string" },
    exchangeRateToTnd: { type: "number", minimum: 0 },
    approvalMode: {
      type: "string",
      enum: ["SINGLE_LEVEL", "MULTI_LEVEL"],
    },
    lowPriorityNeedsApproval: { type: "boolean" },
    urgentAutoEscalation: { type: "boolean" },
    purchasedProductCategories: {
      type: "array",
      items: { type: "string" },
    },
    unitsOfMeasure: {
      type: "array",
      items: { type: "string" },
    },
  },
};

module.exports = {
  updatePurchaseSettingsBody,
};
