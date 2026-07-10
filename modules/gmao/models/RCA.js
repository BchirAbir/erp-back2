const mongoose = require('mongoose')
const { nextCode } = require('../utils/idSequence')

const rcaSchema = new mongoose.Schema({
  reference:           { type: String, unique: true, trim: true },
  titre:               { type: String, required: true, trim: true },
  equipement:          { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  descriptionProbleme: { type: String, required: true, trim: true },
  pourquoi1:           { type: String, trim: true, default: 'Pourquoi 1 ?' },
  reponse1:            { type: String, trim: true, default: '' },
  pourquoi2:           { type: String, trim: true, default: 'Pourquoi 2 ?' },
  reponse2:            { type: String, trim: true, default: '' },
  pourquoi3:           { type: String, trim: true, default: 'Pourquoi 3 ?' },
  reponse3:            { type: String, trim: true, default: '' },
  pourquoi4:           { type: String, trim: true, default: 'Pourquoi 4 ?' },
  reponse4:            { type: String, trim: true, default: '' },
  pourquoi5:           { type: String, trim: true, default: 'Pourquoi 5 ?' },
  reponse5:            { type: String, trim: true, default: '' },
  causeRacine:         { type: String, required: true, trim: true },
  actionCorrective:    { type: String, trim: true, default: '' },
  actionPreventive:    { type: String, trim: true, default: '' },
  responsable:         { type: String, required: true, trim: true },
  dateEcheance:        { type: Date },
  statut:              { type: String, enum: ['Ouvert', 'En cours', 'Cloture'], default: 'Ouvert' },
}, { timestamps: true })

rcaSchema.pre('validate', async function() {
  if (!this.reference) {
    this.reference = await nextCode('RCA', 'reference', 'RCA-')
  }
})

rcaSchema.index({ equipement: 1, statut: 1, createdAt: -1 })

module.exports = mongoose.models.RCA || mongoose.model('RCA', rcaSchema, 'gmao_rcas')

