const MaintenancePreventive = require('../models/MaintenancePreventive')
const OrdreTravail          = require('../models/OrdreTravail')
const User                  = require('../models/User')
const { success, error, paginated } = require('../utils/apiResponse')
const logger = require('../utils/logger')

// GET /api/planning/semaine  - planning hebdomadaire de tous les techniciens
exports.getSemaine = async (req, res, next) => {
  try {
    // Calcul début/fin de semaine demandée (défaut: semaine courante)
    const offset = Number(req.query.offset || 0) // 0=cette semaine, -1=préc, 1=suiv
    const lundi  = new Date()
    const day = lundi.getDay()
    const diffToMonday = (day + 6) % 7
    lundi.setDate(lundi.getDate() - diffToMonday + offset * 7)
    lundi.setHours(0, 0, 0, 0)
    const dimanche = new Date(lundi)
    dimanche.setDate(dimanche.getDate() + 6)
    dimanche.setHours(23, 59, 59, 999)

    const techniciens = await User.find({ role: 'technician', actif: true }).sort({ nom: 1 })

    const planning = await Promise.all(techniciens.map(async (tech) => {
      const ots    = await OrdreTravail.find({
        technicien:    tech._id,
        datePlanifiee: { $gte: lundi, $lte: dimanche },
        statut:        { $ne: 'cancelled' },
      }).populate('equipement', 'nom localisation')

      const tempsTotal = ots.reduce((s, o) => s + (o.tempsEstime || 0), 0)
      const capacite   = 7 * 8 * 60
      const taux       = +(tempsTotal / capacite * 100).toFixed(0)
      const surchargeMinutes = Math.max(0, tempsTotal - capacite)

      return {
        technicien: {
          _id:       tech._id,
          nom:       tech.nom,
          prenom:    tech.prenom,
          initiales: tech.initiales,
          color:     tech.color,
          specialite:tech.specialite,
          disponibilite: tech.disponibilite,
        },
        taux,
        tempsTotal,
        capacite,
        surchargeMinutes,
        ots: ots.map(o => ({
          _id:           o._id,
          idOT:          o.idOT,
          titre:         o.titre,
          typeOT:        o.typeOT,
          priorite:      o.priorite,
          statut:        o.statut,
          datePlanifiee: o.datePlanifiee,
          tempsEstime:   o.tempsEstime,
          equipement:    o.equipement,
        })),
      }
    }))

    return success(res, { planning, semaine: { debut: lundi, fin: dimanche, offset } })
  } catch (err) { next(err) }
}

// GET /api/planning/preventif  - plans de maintenance préventive
exports.getPlansPreventifs = async (req, res, next) => {
  try {
    const { page=1, limit=20, equipement } = req.query
    const filter = { actif: true }
    if (equipement) filter.equipement = equipement

    const total = await MaintenancePreventive.countDocuments(filter)
    const plans = await MaintenancePreventive.find(filter)
      .populate('equipement',     'nom idEquipement localisation')
      .populate('piecesRequises.piece', 'nomPiece reference')
      .sort({ dateProchaine: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    return paginated(res, plans, total, page, limit, 'Plans récupérés')
  } catch (err) { next(err) }
}

// GET /api/planning/preventif/:id
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await MaintenancePreventive.findById(req.params.id)
      .populate('equipement', 'nom idEquipement localisation etat')
      .populate('piecesRequises.piece', 'nomPiece reference quantiteStock')
      .populate('otGeneres', 'idOT statut datePlanifiee dateCloture')
    if (!plan) return error(res, 'Plan introuvable', 404)
    return success(res, { plan })
  } catch (err) { next(err) }
}

// POST /api/planning/preventif  - créer un plan préventif
exports.creerPlan = async (req, res, next) => {
  try {
    const plan = await MaintenancePreventive.create(req.body)
    logger.info(`Plan préventif créé : ${plan.idPlan} - équipement: ${plan.equipement}`)
    return success(res, { plan }, 'Plan de maintenance créé', 201)
  } catch (err) { next(err) }
}

// PUT /api/planning/preventif/:id
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await MaintenancePreventive.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('equipement', 'nom idEquipement')
    if (!plan) return error(res, 'Plan introuvable', 404)
    return success(res, { plan }, 'Plan mis à jour')
  } catch (err) { next(err) }
}

// POST /api/planning/preventif/:id/generer-ot  - genererOT() du diagramme MaintenancePreventive
exports.genererOT = async (req, res, next) => {
  try {
    const plan = await MaintenancePreventive.findById(req.params.id).populate('equipement')
    if (!plan) return error(res, 'Plan introuvable', 404)

    const ot = await OrdreTravail.create({
      typeOT:        'preventive',
      priorite:      'normal',
      statut:        'planned',
      equipement:    plan.equipement._id,
      titre:         `Maintenance préventive - ${plan.equipement.nom}`,
      description:   plan.description || `Exécution plan ${plan.idPlan} : ${plan.nom}`,
      datePlanifiee: plan.dateProchaine,
      tempsEstime:   plan.dureeEstimeeMin,
      creePar:       req.user._id,
    })

    // Mettre à jour le plan
    plan.otGeneres.push(ot._id)
    plan.derniereMaintenance = new Date()
    plan.dateProchaine = new Date(Date.now() + plan.frequenceJours * 24 * 3600 * 1000)
    plan.compliancePct = 100
    await plan.save()

    logger.info(`OT préventif généré : ${ot.idOT} depuis plan ${plan.idPlan}`)
    return success(res, { ot, plan }, `OT ${ot.idOT} généré`, 201)
  } catch (err) { next(err) }
}

// DELETE /api/planning/preventif/:id
exports.deletePlan = async (req, res, next) => {
  try {
    await MaintenancePreventive.findByIdAndUpdate(req.params.id, { actif: false })
    return success(res, {}, 'Plan désactivé')
  } catch (err) { next(err) }
}





