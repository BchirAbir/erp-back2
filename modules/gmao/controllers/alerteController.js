const AlerteIA     = require('../models/AlerteIA')
const OrdreTravail = require('../models/OrdreTravail')
const { success, error, paginated } = require('../utils/apiResponse')
const logger = require('../utils/logger')

// GET /api/alertes
exports.getAll = async (req, res, next) => {
  try {
    const page  = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const { statut, niveau, equipement } = req.query

    // Construction du filtre
    const filter = {}
    if (statut) filter.statut = statut
    if (equipement) filter.equipement = equipement
    if (niveau !== undefined) filter.niveau = Number(niveau) // Gère correctement le niveau 0 si existant

    const total = await AlerteIA.countDocuments(filter)
    const data  = await AlerteIA.find(filter)
      .populate('equipement', 'nom idEquipement localisation')
      .populate('capteurs',   'typeCapteur valeur unite niveau')
      .populate('otGenere',   'idOT statut priorite')
      .populate('traitePar',  'nom prenom role')
      .sort({ dateDetection: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return paginated(res, data, total, page, limit, 'Alertes récupérées')
  } catch (err) { next(err) }
}

// GET /api/alertes/:id
exports.getOne = async (req, res, next) => {
  try {
    const alerte = await AlerteIA.findById(req.params.id)
      .populate('equipement', 'nom idEquipement localisation etat')
      .populate('capteurs',   'typeCapteur valeur unite seuilAlerte seuilCritique niveau')
      .populate('otGenere',   'idOT statut priorite typeOT datePlanifiee')
      .populate('traitePar',  'nom prenom role')
      
    if (!alerte) return error(res, 'Alerte introuvable', 404)
    return success(res, { alerte })
  } catch (err) { next(err) }
}

// POST /api/alertes
exports.create = async (req, res, next) => {
  try {
    const alerte = await AlerteIA.create(req.body) // Nettoyage de {...req.body} inutile
    logger.info(`Alerte IA créée – Niv.${alerte.niveau}`)
    return success(res, { alerte }, 'Alerte créée', 201)
  } catch (err) { next(err) }
}

// PUT /api/alertes/:id/traiter
exports.traiter = async (req, res, next) => {
  try {
    const alerte = await AlerteIA.findById(req.params.id)
    if (!alerte)                      return error(res, 'Alerte introuvable', 404)
    if (alerte.statut === 'treated')  return error(res, 'Alerte déjà traitée', 400)

    alerte.statut         = 'treated'
    alerte.traitePar      = req.user._id
    alerte.dateTraitement = new Date()
    alerte.commentaire    = req.body.commentaire
    await alerte.save()

    return success(res, { alerte }, 'Alerte traitée')
  } catch (err) { next(err) }
}

// PUT /api/alertes/:id/ignorer
exports.ignorer = async (req, res, next) => {
  try {
    const alerte = await AlerteIA.findByIdAndUpdate(
      req.params.id,
      { statut: 'ignored', traitePar: req.user._id, dateTraitement: new Date() },
      { new: true }
    )
    if (!alerte) return error(res, 'Alerte introuvable', 404)
    return success(res, { alerte }, 'Alerte ignorée')
  } catch (err) { next(err) }
}

// POST /api/alertes/:id/creer-ot
exports.creerOT = async (req, res, next) => {
  try {
    const alerte = await AlerteIA.findById(req.params.id)
    if (!alerte)             return error(res, 'Alerte introuvable', 404)
    if (alerte.otGenere)     return error(res, 'Un OT a déjà été généré pour cette alerte', 409)

    const prioriteMap = { 3: 'critical', 2: 'high', 1: 'normal' }
    
    // Création ot
    const ot = await OrdreTravail.create({
      typeOT:        alerte.niveau === 3 ? 'corrective' : 'predictive',
      priorite:      prioriteMap[alerte.niveau] || 'normal',
      statut:        'open',
      equipement:    alerte.equipement, // L'ID stocké suffit largement ici
      titre:         `OT IA – Niveau ${alerte.niveau}`,
      description:   alerte.description,
      datePlanifiee: new Date(),
      tempsEstime:   alerte.niveau === 3 ? 120 : 90,
      creePar:       req.user._id,
      declencheurIA: { modele: alerte.modele, scoreConfiance: alerte.scoreConfiance, alerteId: alerte._id },
    })

    alerte.otGenere = ot._id
    alerte.statut   = 'treated'
    alerte.traitePar = req.user._id
    alerte.dateTraitement = new Date()
    await alerte.save()

    logger.info(`OT ${ot.idOT} généré depuis alerte IA`)
    return success(res, { ot, alerte }, `OT ${ot.idOT} créé depuis l'alerte`, 201)
  } catch (err) { next(err) }
}

// GET /api/alertes/stats
exports.getStats = async (req, res, next) => {
  try {
    const [total, actives, traitees, parNiveau] = await Promise.all([
      AlerteIA.countDocuments({}),
      AlerteIA.countDocuments({ statut: 'active' }),
      AlerteIA.countDocuments({ statut: 'treated' }),
      AlerteIA.aggregate([{ $group: { _id: '$niveau', count: { $sum: 1 } } }]),
    ])
    return success(res, { total, actives, traitees, parNiveau })
  } catch (err) { next(err) }
}