const RCA = require('../models/RCA')
const Equipement = require('../models/Equipement')
const { success, error } = require('../utils/apiResponse')

function clean(body) {
  const payload = {
    titre: body.titre,
    equipement: body.equipement,
    descriptionProbleme: body.descriptionProbleme,
    pourquoi1: body.pourquoi1 || 'Pourquoi 1 ?',
    reponse1: body.reponse1 || '',
    pourquoi2: body.pourquoi2 || 'Pourquoi 2 ?',
    reponse2: body.reponse2 || '',
    pourquoi3: body.pourquoi3 || 'Pourquoi 3 ?',
    reponse3: body.reponse3 || '',
    pourquoi4: body.pourquoi4 || 'Pourquoi 4 ?',
    reponse4: body.reponse4 || '',
    pourquoi5: body.pourquoi5 || 'Pourquoi 5 ?',
    reponse5: body.reponse5 || '',
    causeRacine: body.causeRacine,
    actionCorrective: body.actionCorrective || '',
    actionPreventive: body.actionPreventive || '',
    responsable: body.responsable,
    statut: body.statut || 'Ouvert',
  }
  if (body.dateEcheance) payload.dateEcheance = new Date(body.dateEcheance)
  return payload
}

async function validatePayload(payload) {
  const required = ['titre', 'equipement', 'descriptionProbleme', 'causeRacine', 'responsable']
  for (const field of required) {
    if (!payload[field] || String(payload[field]).trim() === '') throw new Error('Champs obligatoires incomplets')
  }
  if (!['Ouvert', 'En cours', 'Cloture'].includes(payload.statut)) throw new Error('Statut invalide')
  const equipement = await Equipement.findById(payload.equipement)
  if (!equipement) throw new Error('Equipement introuvable')
  if (payload.dateEcheance && Number.isNaN(payload.dateEcheance.getTime())) throw new Error('Date echeance invalide')
}

exports.getAll = async (req, res, next) => {
  try {
    const rcas = await RCA.find().populate('equipement', 'nom idEquipement localisation').sort({ createdAt: -1 })
    return success(res, { rcas, count: rcas.length }, 'RCA charges')
  } catch (err) { next(err) }
}

exports.create = async (req, res) => {
  try {
    const payload = clean(req.body)
    await validatePayload(payload)
    const item = await RCA.create(payload)
    const rca = await RCA.findById(item._id).populate('equipement', 'nom idEquipement localisation')
    return success(res, { rca }, 'RCA cree', 201)
  } catch (err) { return error(res, err.message || 'Creation impossible', 400) }
}

exports.update = async (req, res) => {
  try {
    const item = await RCA.findById(req.params.id)
    if (!item) return error(res, 'RCA introuvable', 404)
    const payload = clean(req.body)
    await validatePayload(payload)
    Object.assign(item, payload)
    await item.save()
    const rca = await RCA.findById(item._id).populate('equipement', 'nom idEquipement localisation')
    return success(res, { rca }, 'RCA modifie')
  } catch (err) { return error(res, err.message || 'Modification impossible', 400) }
}

exports.remove = async (req, res) => {
  try {
    const item = await RCA.findByIdAndDelete(req.params.id)
    if (!item) return error(res, 'RCA introuvable', 404)
    return success(res, {}, 'RCA supprime')
  } catch (err) { return error(res, err.message || 'Suppression impossible', 400) }
}
