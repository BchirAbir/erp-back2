const mongoose = require('mongoose')
const { nextCode } = require('../utils/idSequence')

const pieceDetacheeSchema = new mongoose.Schema({
  idPiece:       { type: String, unique: true, trim: true },
  nomPiece:      { type: String, required: true, trim: true },
  reference:     { type: String, required: true, unique: true, trim: true },
  description:   { type: String, trim: true },
  categorie:     { type: String, enum: ['mécanique','électrique','hydraulique','pneumatique','consommable','autre'], default: 'mécanique' },
  fournisseur:   { type: String, trim: true },
  unite:         { type: String, default: 'unité', trim: true },
  quantiteStock: { type: Number, required: true, default: 0, min: 0 },
  seuilAlerte:   { type: Number, required: true, default: 5 },
  seuilCritique: { type: Number, default: 2 },
  stockMaximum:  { type: Number },
  emplacement:   { type: String, trim: true },
  prixUnitaire:  { type: Number, default: 0 },
  prixTotal:     { type: Number, default: 0 },
  equipementsCompatibles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipement' }],
  historique: [{
    ordreTravauxId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrdreTravail' },
    type:           { type: String, enum: ['consommation', 'commande'], required: true },
    quantite:       { type: Number, required: true },
    date:           { type: Date, default: Date.now },
    technicien:     { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
    observation:    { type: String, trim: true },
  }],
  actif: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } })

pieceDetacheeSchema.virtual('statutStock').get(function () {
  if (this.quantiteStock <= this.seuilCritique) return 'critique'
  if (this.quantiteStock <= this.seuilAlerte)   return 'bas'
  return 'normal'
})

pieceDetacheeSchema.pre('save', async function () {
  if (!this.idPiece) {
    this.idPiece = await nextCode('PieceDetachee', 'idPiece', 'P-', 4, 'P')
  }
  this.prixTotal = (this.quantiteStock || 0) * (this.prixUnitaire || 0)
})

// ⚠️ unique:true sur idPiece et reference crée déjà les index
pieceDetacheeSchema.index({ quantiteStock: 1 })
pieceDetacheeSchema.index({ categorie: 1 })

pieceDetacheeSchema.methods.consommer = async function (qty, otId, techId) {
  if (this.quantiteStock < qty) throw new Error('Stock insuffisant')
  this.quantiteStock -= qty
  this.historique.push({ ordreTravauxId: otId, type: 'consommation', quantite: qty, technicien: techId })
  return this.save()
}

module.exports = mongoose.models.PieceDetachee || mongoose.model('PieceDetachee', pieceDetacheeSchema, 'gmao_piecedetachees')