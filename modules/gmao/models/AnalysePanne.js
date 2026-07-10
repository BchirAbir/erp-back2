const mongoose = require('mongoose')

function calculateRpn(doc) {
  return Number(doc.gravite || 1) * Number(doc.occurrence || 1) * Number(doc.detection || 1)
}

function calculateRisk(rpn) {
  if (rpn <= 80) return 'Faible'
  if (rpn <= 160) return 'Moyen'
  if (rpn <= 250) return 'Eleve'
  return 'Critique'
}

const analysePanneSchema = new mongoose.Schema({
  equipement:         { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  equipementId:       { type: String, trim: true },
  equipementNom:      { type: String, trim: true },
  titre:              { type: String, required: true, trim: true },
  composant:          { type: String, required: true, trim: true },
  fonction:           { type: String, required: true, trim: true },
  modeDefaillance:    { type: String, required: true, trim: true },
  effet:              { type: String, required: true, trim: true },
  cause:              { type: String, required: true, trim: true },
  gravite:            { type: Number, default: 1, min: 1, max: 10 },
  occurrence:         { type: Number, default: 1, min: 1, max: 10 },
  detection:          { type: Number, default: 1, min: 1, max: 10 },
  rpn:                { type: Number, default: 1 },
  niveauRisque:       { type: String, enum: ['Faible', 'Moyen', 'Eleve', 'Critique'], default: 'Faible' },
  actionRecommandee:  { type: String, required: true, trim: true },
  responsable:        { type: String, required: true, trim: true },
  statutFmea:         { type: String, enum: ['Brouillon', 'Validee', 'En action', 'Cloturee'], default: 'Brouillon' },
  dateAnalyse:        { type: Date, required: true },
  dateEcheance:       { type: Date, required: true },
  commentaire:        { type: String, trim: true, default: '' },

  causeRacine:        { type: String, trim: true },
  methode:            { type: String, enum: ['FMEA'], default: 'FMEA' },
  criticite:          { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  frequence:          { type: Number, default: 1 },
  impactHeures:       { type: Number, default: 0 },
  actions:            { type: String, trim: true },
  statut:             { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
  creePar:            { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
}, { timestamps: true })

analysePanneSchema.pre('validate', function() {
  if (this.dateAnalyse && this.dateEcheance && this.dateEcheance < this.dateAnalyse) {
    this.invalidate('dateEcheance', 'La date echeance doit etre superieure ou egale a la date analyse')
  }

  this.rpn = calculateRpn(this)
  this.niveauRisque = calculateRisk(this.rpn)

  if (!this.causeRacine && this.cause) this.causeRacine = this.cause
  if (!this.actions && this.actionRecommandee) this.actions = this.actionRecommandee
  if (this.niveauRisque === 'Critique') this.criticite = 'critical'
  else if (this.niveauRisque === 'Eleve') this.criticite = 'high'
  else if (this.niveauRisque === 'Moyen') this.criticite = 'medium'
  else this.criticite = 'low'
})

analysePanneSchema.index({ equipement: 1, niveauRisque: 1, statutFmea: 1 })
analysePanneSchema.index({ composant: 'text', fonction: 'text', modeDefaillance: 'text', effet: 'text', cause: 'text', actionRecommandee: 'text', responsable: 'text' })

module.exports = mongoose.models.AnalysePanne || mongoose.model('AnalysePanne', analysePanneSchema, 'gmao_analysepannes')

