const mongoose = require('mongoose')

const weibullAnalysisSchema = new mongoose.Schema({
  equipement:          { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  dureesVie:           [{ type: Number, min: 0 }],
  beta:                { type: Number, required: true, min: 0.01 },
  eta:                 { type: Number, required: true, min: 0.01 },
  mtbf:                { type: Number, default: 0 },
  tauxDefaillance:     { type: Number, default: 0 },
  probabilitePanne:    { type: Number, default: 0 },
  fiabiliteRestante:   { type: Number, default: 0 },
  ageActuel:           { type: Number, required: true, min: 0 },
  recommandation:      { type: String, trim: true, default: '' },
}, { timestamps: true })

weibullAnalysisSchema.index({ equipement: 1, createdAt: -1 })

module.exports = mongoose.models.WeibullAnalysis || mongoose.model('WeibullAnalysis', weibullAnalysisSchema, 'gmao_weibullanalyses')
