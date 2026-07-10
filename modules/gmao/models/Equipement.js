const mongoose = require('mongoose')

const equipementSchema = new mongoose.Schema({
  idEquipement:      { type: String, required: true, unique: true, trim: true },
  nom:               { type: String, required: true, trim: true },
  type:              { type: String, required: true, enum: ['Machine-outil','Presse','Robot industriel','Utilitaire','Manutention','Thermique','Électrique','Pneumatique','Hydraulique','Autre'] },
  localisation:      { type: String, required: true, trim: true },
  site:              { type: String, trim: true, default: 'Site principal' },
  batiment:          { type: String, trim: true },
  ligne:             { type: String, trim: true },
  etat:              { type: String, enum: ['operational','maintenance','failure','standby'], default: 'operational' },
  dateInstallation:  { type: Date, required: true },
  dateMiseEnService: { type: Date },
  fournisseur:       { type: String, trim: true },
  marque:            { type: String, trim: true },
  modele:            { type: String, trim: true },
  numeroSerie:       { type: String, trim: true },
  coutAcquisition:   { type: Number, default: 0 },
  valeurNette:       { type: Number, default: 0 },
  mtbf:              { type: Number, default: 0 },
  mttr:              { type: Number, default: 0 },
  disponibilite:     { type: Number, default: 100 },
  nbPannes:          { type: Number, default: 0 },
  tempsArretTotal:   { type: Number, default: 0 },
  planPreventif: {
    frequenceJours:       { type: Number, default: 90 },
    derniereMaintenance:  { type: Date },
    prochaineMaintenance: { type: Date },
    compliancePct:        { type: Number, default: 100 },
  },
  qrCode:    { type: String, trim: true },
  rfidTag:   { type: String, trim: true },
  documents: [{
    nom:  { type: String },
    type: { type: String, enum: ['manuel','plan','schema','certificat','autre'] },
    url:  { type: String },
  }],
  actif: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } })

// ⚠️ PAS de schema.index({ idEquipement:1 }) → unique:true le crée déjà
equipementSchema.index({ etat: 1 })
equipementSchema.index({ localisation: 1 })
equipementSchema.index({ type: 1 })

module.exports = mongoose.models.Equipement || mongoose.model('Equipement', equipementSchema, 'gmao_equipements')
