// schemas/campaign.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createCampaignBody = {
  type: "object",
  additionalProperties: false,
  required: ["name", "channel"],
  properties: {
    name:           { type: "string", minLength: 1 },
    channel:        { type: "string", enum: ["Email", "PPC", "Social", "Display", "Video", "Other"] },
    status:         { type: "string", enum: ["Active", "Paused", "Planned", "Completed"] },
    leads:          { type: "number", minimum: 0 },
    budget:         { type: "number", minimum: 0 },
    spend:          { type: "number", minimum: 0 },
    startDate:      { type: "string" },
    endDate:        { type: "string" },
    description:    { type: "string" },
    impressions:    { type: "number", minimum: 0 },
    openRate:       { type: "number", minimum: 0, maximum: 100 },
    ctr:            { type: "number", minimum: 0, maximum: 100 },
    conversionRate: { type: "number", minimum: 0, maximum: 100 },
  },
};

const updateCampaignBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:           { type: "string", minLength: 1 },
    channel:        { type: "string", enum: ["Email", "PPC", "Social", "Display", "Video", "Other"] },
    status:         { type: "string", enum: ["Active", "Paused", "Planned", "Completed"] },
    leads:          { type: "number", minimum: 0 },
    budget:         { type: "number", minimum: 0 },
    spend:          { type: "number", minimum: 0 },
    startDate:      { type: "string" },
    endDate:        { type: "string" },
    description:    { type: "string" },
    impressions:    { type: "number", minimum: 0 },
    openRate:       { type: "number", minimum: 0, maximum: 100 },
    ctr:            { type: "number", minimum: 0, maximum: 100 },
    conversionRate: { type: "number", minimum: 0, maximum: 100 },
  },
};

module.exports = { createCampaignBody, updateCampaignBody, idParam };