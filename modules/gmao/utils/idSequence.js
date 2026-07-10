const mongoose = require('mongoose')

function getTrailingNumber(value) {
  const match = String(value || '').match(/(\d+)$/)
  return match ? Number(match[1]) : 0
}

async function nextCode(modelName, field, prefix, size = 4, lookupPrefix = prefix) {
  const Model = mongoose.model(modelName)
  const docs = await Model.find({ [field]: { $exists: true, $ne: '' } }).select(field).lean()
  const lastNumber = docs.reduce((max, doc) => {
    const value = String(doc[field] || '')
    if (!value.startsWith(lookupPrefix)) return max
    return Math.max(max, getTrailingNumber(value))
  }, 0)
  return prefix + String(lastNumber + 1).padStart(size, '0')
}

module.exports = { nextCode }
