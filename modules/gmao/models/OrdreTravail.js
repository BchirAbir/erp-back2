const mongoose = require('mongoose')
const { nextCode } = require('../utils/idSequence')

const ordreTravailSchema = new mongoose.Schema({
  idOT:          { type: String, unique: true },
  typeOT:        { type: String, required: true, enum: ['corrective','preventive','predictive','regulatory'] },
  statut:        { type: String, enum: ['open','planned','in_progress','closed','escalated','cancelled'], default: 'open' },
  priorite:      { type: String, enum: ['critical','high','normal','low'], default: 'normal' },
  equipement:    { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  technicien:    { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
  creePar:       { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
  titre:         { type: String, required: true, trim: true },
  description:   { type: String, required: true, trim: true },
  consignesSecurite: { type: String, trim: true },
  datePlanifiee: { type: Date, required: true },
  dateDebut:     { type: Date },
  dateFin:       { type: Date },
  dateCloture:   { type: Date },
  dateEscalade:  { type: Date },
  tempsEstime:   { type: Number, required: true, min: 1 },
  tempsReel:     { type: Number },
  cloture: {
    resultat:         { type: String, enum: ['resolved','partial','unresolved'], default: 'resolved' },
    causePanne:       { type: String, trim: true },
    travailRealise:   { type: String, trim: true },
    recommandations:  { type: String, trim: true },
    tempsReel:        { type: Number },
  },
  escalade: {
    motif:        { type: String, trim: true },
    escaladePar:  { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
    dateEscalade: { type: Date },
  },
  declencheurIA: {
    modele:         { type: String, trim: true },
    scoreConfiance: { type: Number, min: 0, max: 1 },
    alerteId:       { type: mongoose.Schema.Types.ObjectId, ref: 'AlerteIA' },
  },
  piecesConsommees: [{
    piece:            { type: mongoose.Schema.Types.ObjectId, ref: 'PieceDetachee' },
    quantite:         { type: Number, default: 1 },
    dateConsommation: { type: Date, default: Date.now },
  }],
  coutMainOeuvre: { type: Number, default: 0 },
  coutPieces:     { type: Number, default: 0 },
  coutTotal:      { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true } })

// Auto-génération idOT
ordreTravailSchema.pre('save', async function () {
  if (!this.idOT) {
    const year = new Date().getFullYear()
    this.idOT = await nextCode('OrdreTravail', 'idOT', `OT-${year}-`)
  }
})

ordreTravailSchema.pre('save', function () {
  this.coutTotal = (this.coutMainOeuvre || 0) + (this.coutPieces || 0)
})

// ⚠️ unique:true crée déjà l'index sur idOT → on n'en rajoute pas
ordreTravailSchema.index({ statut: 1 })
ordreTravailSchema.index({ priorite: 1 })
ordreTravailSchema.index({ equipement: 1 })
ordreTravailSchema.index({ technicien: 1 })
ordreTravailSchema.index({ datePlanifiee: 1 })
ordreTravailSchema.index({ typeOT: 1, statut: 1 })

module.exports = mongoose.models.OrdreTravail || mongoose.model('OrdreTravail', ordreTravailSchema, 'gmao_ordretravails')
