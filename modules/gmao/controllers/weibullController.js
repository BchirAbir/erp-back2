const WeibullAnalysis = require('../models/WeibullAnalysis')
const Equipement = require('../models/Equipement')
const { success, error } = require('../utils/apiResponse')

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function estimateBeta(values) {
  if (values.length < 2) return 1.5
  const mean = average(values)
  const variance = average(values.map(value => Math.pow(value - mean, 2)))
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
  if (cv >= 1) return 1
  if (cv >= 0.5) return 1.5
  return 2.5
}

function recommendation(probability) {
  if (probability > 70) return 'Remplacement urgent'
  if (probability >= 40) return 'Planifier remplacement preventif'
  return 'Continuer surveillance'
}

function parseDurations(input) {
  if (!Array.isArray(input)) return []
  return input.map(Number).filter(value => Number.isFinite(value) && value > 0)
}

function calculate(body) {
  const dureesVie = parseDurations(body.dureesVie)
  if (!dureesVie.length) throw new Error('Durees de vie obligatoires')

  const ageActuel = Number(body.ageActuel)
  if (!Number.isFinite(ageActuel) || ageActuel <= 0) throw new Error('Age actuel invalide')

  const betaInput = Number(body.beta)
  const etaInput = Number(body.eta)
  const beta = Number.isFinite(betaInput) && betaInput > 0 ? betaInput : estimateBeta(dureesVie)
  const eta = Number.isFinite(etaInput) && etaInput > 0 ? etaInput : average(dureesVie)
  if (!Number.isFinite(eta) || eta <= 0) throw new Error('Eta invalide')

  const exponent = Math.pow(ageActuel / eta, beta)
  const reliability = Math.exp(-exponent)
  const probability = 1 - reliability
  const tauxDefaillance = (beta / eta) * Math.pow(ageActuel / eta, beta - 1)

  return {
    dureesVie,
    ageActuel,
    beta: Number(beta.toFixed(4)),
    eta: Number(eta.toFixed(2)),
    mtbf: Number(average(dureesVie).toFixed(2)),
    tauxDefaillance: Number(tauxDefaillance.toFixed(6)),
    probabilitePanne: Number((probability * 100).toFixed(2)),
    fiabiliteRestante: Number((reliability * 100).toFixed(2)),
    recommandation: recommendation(probability * 100),
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const analyses = await WeibullAnalysis.find()
      .populate('equipement', 'nom idEquipement localisation')
      .sort({ createdAt: -1 })
    return success(res, { analyses, count: analyses.length }, 'Analyses Weibull chargees')
  } catch (err) { next(err) }
}

exports.create = async (req, res) => {
  try {
    const equipement = await Equipement.findById(req.body.equipement)
    if (!equipement) return error(res, 'Equipement introuvable', 404)

    const calculated = calculate(req.body)
    const item = await WeibullAnalysis.create({ equipement: req.body.equipement, ...calculated })
    const analyse = await WeibullAnalysis.findById(item._id).populate('equipement', 'nom idEquipement localisation')
    return success(res, { analyse }, 'Analyse Weibull creee', 201)
  } catch (err) {
    return error(res, err.message || 'Creation impossible', 400)
  }
}

exports.remove = async (req, res) => {
  try {
    const item = await WeibullAnalysis.findByIdAndDelete(req.params.id)
    if (!item) return error(res, 'Analyse Weibull introuvable', 404)
    return success(res, {}, 'Analyse Weibull supprimee')
  } catch (err) {
    return error(res, err.message || 'Suppression impossible', 400)
  }
}
