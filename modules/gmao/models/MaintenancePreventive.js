const mongoose = require('mongoose')
const { nextCode } = require('../utils/idSequence')

const maintenancePreventiveSchema = new mongoose.Schema({
  idPlan:         { type: String, unique: true },
  nom:            { type: String, required: true, trim: true },
  description:    { type: String, trim: true },
  equipement:     { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  frequenceJours: { type: Number, required: true, min: 1 },
  frequenceLabel: { type: String, trim: true },
  dateProchaine:  { type: Date, required: true },
  derniereMaintenance: { type: Date },
  operations: [{
    ordre:       { type: Number },
    description: { type: String, trim: true },
    dureeMin:    { type: Number },
    competence:  { type: String, trim: true },
  }],
  piecesRequises: [{
    piece:    { type: mongoose.Schema.Types.ObjectId, ref: 'PieceDetachee' },
    quantite: { type: Number, default: 1 },
  }],
  dureeEstimeeMin: { type: Number, default: 120 },
  compliancePct:   { type: Number, default: 100 },
  actif:           { type: Boolean, default: true },
  otGeneres:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrdreTravail' }],
}, { timestamps: true })

maintenancePreventiveSchema.pre('save', async function () {
  if (!this.idPlan) {
    this.idPlan = await nextCode('MaintenancePreventive', 'idPlan', 'MP-')
  }
})

// ⚠️ unique:true sur idPlan crée déjà l'index
maintenancePreventiveSchema.index({ equipement: 1 })
maintenancePreventiveSchema.index({ dateProchaine: 1 })

module.exports = mongoose.models.MaintenancePreventive || mongoose.model('MaintenancePreventive', maintenancePreventiveSchema, 'gmao_maintenancepreventives')
