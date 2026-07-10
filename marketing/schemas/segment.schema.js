// schemas/segment.schema.js

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

const createSegmentBody = {
  type: "object",
  required: ["name"],
  properties: {
    name:        { type: "string", minLength: 1 },
    customers:   { type: "number", minimum: 0 },
    avgSpend:    { type: "number", minimum: 0 },
    growthPct:   { type: "number" },
    regionType:  { type: "string", enum: ["Country", "Continent"] },
    region:      { type: "string" },
    status:      { type: "string", enum: ["Growing", "Stable", "Declining", "At Risk", "To Discover"] },
    description: { type: "string" },
  },
};

const updateSegmentBody = {
  type: "object",
  properties: {
    name:        { type: "string", minLength: 1 },
    customers:   { type: "number", minimum: 0 },
    avgSpend:    { type: "number", minimum: 0 },
    growthPct:   { type: "number" },
    regionType:  { type: "string", enum: ["Country", "Continent"] },
    region:      { type: "string" },
    status:      { type: "string", enum: ["Growing", "Stable", "Declining", "At Risk", "To Discover"] },
    description: { type: "string" },
  },
};

module.exports = { createSegmentBody, updateSegmentBody, idParam };