const mongoose = require('mongoose')

const conformiteReglementaireSchema = new mongoose.Schema({
  equipement:      { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  typeControle:    { type: String, required: true, trim: true },
  organisme:       { type: String, trim: true },
  dateDerniere:    { type: Date },
  dateEcheance:    { type: Date, required: true },
  periodiciteMois: { type: Number, default: 12 },
  statut:          { type: String, enum: ['valid', 'due_soon', 'expired'], default: 'valid' },
  document:        { type: String, trim: true },
  observations:    { type: String, trim: true },
}, { timestamps: true })

conformiteReglementaireSchema.index({ dateEcheance: 1, statut: 1 })

module.exports = mongoose.models.ConformiteReglementaire || mongoose.model('ConformiteReglementaire', conformiteReglementaireSchema, 'gmao_conformitereglementaires')
