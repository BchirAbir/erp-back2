const mongoose = require('mongoose')

const mesureSchema = new mongoose.Schema({
  valeur:    { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  niveau:    { type: String, enum: ['ok','warn','crit'], default: 'ok' },
}, { _id: false })

const capteurIoTSchema = new mongoose.Schema({
  idCapteur:    { type: String, required: true, unique: true, trim: true },
  typeCapteur:  { type: String, required: true, trim: true },
  unite:        { type: String, required: true, trim: true },
  protocole:    { type: String, enum: ['MQTT','Modbus','OPC-UA','HTTP','autre'], default: 'MQTT' },
  equipement:   { type: mongoose.Schema.Types.ObjectId, ref: 'Equipement', required: true },
  valeur:       { type: Number, default: 0 },
  valeurMin:    { type: Number },
  valeurMax:    { type: Number },
  seuilAlerte:  { type: Number, required: true },
  seuilCritique:{ type: Number, required: true },
  niveau:       { type: String, enum: ['ok','warn','crit'], default: 'ok' },
  derniereMaj:  { type: Date, default: Date.now },
  historique:   { type: [mesureSchema], default: [] },
  actif:        { type: Boolean, default: true },
  position:     { type: String, trim: true },
}, { timestamps: true })

capteurIoTSchema.methods.enregistrerMesure = function (valeur) {
  this.valeur      = valeur
  this.derniereMaj = new Date()
  if (valeur >= this.seuilCritique)    this.niveau = 'crit'
  else if (valeur >= this.seuilAlerte) this.niveau = 'warn'
  else                                 this.niveau = 'ok'
  this.historique.push({ valeur, niveau: this.niveau })
  if (this.historique.length > 1000) this.historique.shift()
  return this.save()
}

// ⚠️ unique:true sur idCapteur crée déjà l'index
capteurIoTSchema.index({ equipement: 1 })
capteurIoTSchema.index({ niveau: 1 })

module.exports = mongoose.models.CapteurIoT || mongoose.model('CapteurIoT', capteurIoTSchema, 'gmao_capteuriots')
