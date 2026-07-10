const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  nom:        { type: String, required: true, trim: true },
  prenom:     { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 6, select: false },
  role:       { type: String, enum: ['manager', 'technician', 'admin'], default: 'technician' },
  specialite: { type: String, trim: true },          // pour techniciens
  telephone:  { type: String, trim: true },
  adresse:    { type: String, trim: true },
  cin:        { type: String, trim: true },
  departement:{ type: String, trim: true },
  habilitations: [{ type: String, trim: true }],
  certifications: [{ type: String, trim: true }],
  planningIntervention: { type: String, trim: true },
  astreintes: { type: String, trim: true },
  disponibilite: { type: Boolean, default: true },
  charge:     { type: Number, default: 0, min: 0, max: 100 }, // % charge semaine
  initiales:  { type: String, trim: true },
  color:      { type: String, default: '#2563EB' },  // couleur avatar UI
  actif:      { type: Boolean, default: true },
  lastLogin:  { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
})

// Virtual : nom complet
userSchema.virtual('nomComplet').get(function () {
  return `${this.prenom} ${this.nom}`
})

// Hash password avant save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

// Auto-générer initiales
userSchema.pre('save', function () {
  if (!this.initiales) {
    this.initiales = `${this.prenom[0]}${this.nom[0]}`.toUpperCase()
  }
})

// Méthode : comparer mot de passe
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

module.exports = mongoose.models.GmaoUser || mongoose.model('GmaoUser', userSchema, 'gmao_users')
