const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  type:       { type: String, required: true, trim: true },
  titre:      { type: String, required: true, trim: true },
  message:    { type: String, required: true, trim: true },
  cibleRole:  { type: String, enum: ['admin', 'manager', 'technician'], required: true },
  creePar:    { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
  technicien: { type: mongoose.Schema.Types.ObjectId, ref: 'GmaoUser' },
  donnees:    { type: mongoose.Schema.Types.Mixed, default: {} },
  lu:         { type: Boolean, default: false },
}, { timestamps: true })

notificationSchema.index({ cibleRole: 1, lu: 1, createdAt: -1 })

module.exports = mongoose.models.GmaoNotification || mongoose.model('GmaoNotification', notificationSchema, 'gmao_notifications')
