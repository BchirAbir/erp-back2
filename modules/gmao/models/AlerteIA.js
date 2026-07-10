const mongoose = require('mongoose')

const alerteIASchema = new mongoose.Schema({
  // MaintenancePredictive: idAnalyse, typeDonnee, seuilPrediction
  niveau:          { type: Number, enum: [1, 2, 3], required: true },  // 1=Surveillance, 2=Attention, 3=Urgence
  typeDonnee:      { type: String, trim: true },
  seuilPrediction: { type: Number },

  // Relation : genere 0..* OT (MaintenancePredictive genere OrdreTravail)
  equipement: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Equipement',
    required: true,
  },
  capteurs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:  'CapteurIoT',
  }],
  otGenere: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'OrdreTravail',
  },

  // Détail alerte
  description:     { type: String, required: true, trim: true },
  dateDetection:   { type: Date, default: Date.now },
  scoreConfiance:  { type: Number, min: 0, max: 1, required: true },
  modele:          { type: String, required: true, trim: true },
  delaiPrevu:      { type: String, trim: true },                   // "< 2h", "48-72h"
  delaiHeures:     { type: Number },                               // valeur numérique
  severite:        { type: String, enum: ['critical','high','normal','low'], default: 'normal' },

  // Statut traitement
  statut:          { type: String, enum: ['active','treated','ignored','escalated'], default: 'active' },
  traitePar:       { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
  dateTraitement:  { type: Date },
  commentaire:     { type: String, trim: true },
}, {
  timestamps: true,
})

alerteIASchema.index({ equipement: 1 })
alerteIASchema.index({ statut: 1 })
alerteIASchema.index({ niveau: 1 })
alerteIASchema.index({ dateDetection: -1 })

module.exports = mongoose.models.AlerteIA || mongoose.model('AlerteIA', alerteIASchema, 'gmao_alerteias')
