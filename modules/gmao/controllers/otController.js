const OrdreTravail   = require('../models/OrdreTravail')
const Equipement     = require('../models/Equipement')
const PieceDetachee  = require('../models/PieceDetachee')
const Notification   = require('../models/Notification')
const { success, error, paginated } = require('../utils/apiResponse')
const logger = require('../utils/logger')

// Fonction utilitaire pour notifier le technicien affecté
async function notifierTechnicienAffecte(ot, creePar) {
  if (!ot || !ot.technicien) return

  const technicienId = typeof ot.technicien === 'object' ? ot.technicien._id : ot.technicien
  const equipementNom = typeof ot.equipement === 'object' ? ot.equipement.nom : ''

  await Notification.create({
    type: 'ot_affecte',
    titre: 'Nouvel OT affecté',
    message: `${ot.idOT || 'OT'} - ${ot.titre}${equipementNom ? ` (${equipementNom})` : ''}`,
    cibleRole: 'technician',
    technicien: technicienId,
    creePar,
    donnees: {
      otId: ot._id,
      idOT: ot.idOT,
      titre: ot.titre,
      priorite: ot.priorite,
      datePlanifiee: ot.datePlanifiee,
      equipement: equipementNom,
    },
  })
}

// GET /api/ordres-travail (Avec filtres et pagination optimisés)
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, statut, priorite, typeOT, technicien, equipement, search } = req.query
    const filter = {}

    if (statut)    filter.statut    = statut
    if (priorite)  filter.priorite  = priorite
    if (typeOT)    filter.typeOT    = typeOT
    if (technicien) filter.technicien = technicien
    if (equipement) filter.equipement = equipement
    if (search) {
      filter.$or = [
        { idOT:        { $regex: search, $options: 'i' } },
        { titre:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    // Restriction stricte : un technicien ne voit que ses tâches assignées
    if (req.user.role === 'technician') filter.technicien = req.user._id

    // Exécution des requêtes en parallèle pour de meilleures performances
    const [data, total] = await Promise.all([
      OrdreTravail.find(filter)
        .populate('equipement', 'idEquipement nom localisation etat')
        .populate('technicien', 'nom prenom initiales color specialite')
        .populate('creePar',    'nom prenom role')
        .populate('piecesConsommees.piece', 'nomPiece reference')
        .sort({ priorite: 1, datePlanifiee: 1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(), // Performance ++ (documents légers en lecture seule)
      OrdreTravail.countDocuments(filter)
    ])

    return paginated(res, data, total, Number(page), Number(limit), 'Ordres de travail récupérés')
  } catch (err) { next(err) }
}

// GET /api/ordres-travail/:id
exports.getOne = async (req, res, next) => {
  try {
    const ot = await OrdreTravail.findById(req.params.id)
      .populate('equipement', 'idEquipement nom localisation etat mtbf mttr')
      .populate('technicien', 'nom prenom initiales color specialite disponibilite')
      .populate('creePar',    'nom prenom role')
      .populate('piecesConsommees.piece', 'nomPiece reference prixUnitaire')
      .populate('declencheurIA.alerteId')

    if (!ot) return error(res, 'Ordre de travail introuvable', 404)
    return success(res, { ot })
  } catch (err) { next(err) }
}

// POST /api/ordres-travail (Création)
exports.create = async (req, res, next) => {
  try {
    const body = { ...req.body, creePar: req.user._id }

    const eq = await Equipement.findById(body.equipement)
    if (!eq) return error(res, 'Équipement introuvable', 404)

    // Ajustements automatiques contextuels
    if (eq.etat === 'failure' && !body.priorite) body.priorite = 'critical'
    if (body.technicien && !body.statut) body.statut = 'planned'

    const ot = await OrdreTravail.create(body)

    // Si panne curative, l'équipement bascule immédiatement en statut "maintenance"
    if (body.typeOT === 'corrective') {
      await Equipement.findByIdAndUpdate(body.equipement, { etat: 'maintenance' })
    }

    const populated = await OrdreTravail.findById(ot._id)
      .populate('equipement', 'idEquipement nom localisation')
      .populate('technicien', 'nom prenom initiales color')
      .populate('creePar',    'nom prenom')

    if (body.technicien) await notifierTechnicienAffecte(populated, req.user._id)

    logger.info(`OT créé : ${ot.idOT} – ${body.typeOT} – ${eq.nom}`)
    return success(res, { ot: populated }, `OT ${ot.idOT} créé avec succès`, 201)
  } catch (err) { next(err) }
}

// PUT /api/ordres-travail/:id (Mise à jour générique)
exports.update = async (req, res, next) => {
  try {
    const previous = await OrdreTravail.findById(req.params.id).select('technicien')
    if (!previous) return error(res, 'OT introuvable', 404)

    const ot = await OrdreTravail.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('equipement', 'idEquipement nom localisation')
      .populate('technicien', 'nom prenom initiales color')

    // Alerte si un nouveau technicien est affecté en remplacement ou ajout
    const oldTech = previous.technicien?.toString()
    const newTech = typeof ot.technicien === 'object' ? ot.technicien?._id?.toString() : ot.technicien?.toString()
    if (newTech && oldTech !== newTech) {
      await notifierTechnicienAffecte(ot, req.user._id)
    }

    return success(res, { ot }, 'OT mis à jour')
  } catch (err) { next(err) }
}

// PUT /api/ordres-travail/:id/affecter
exports.affecter = async (req, res, next) => {
  try {
    const { listTechniciens } = req.body // Supporte l'envoi d'un ID unique ou d'un tableau
    const technicienId = Array.isArray(listTechniciens) ? listTechniciens[0] : (req.body.technicienId || req.body.technicien)
    
    if (!technicienId) return error(res, 'Identifiant technicien requis', 400)

    const ot = await OrdreTravail.findByIdAndUpdate(
      req.params.id,
      { technicien: technicienId, statut: 'planned' },
      { new: true }
    )
      .populate('technicien', 'nom prenom initiales color specialite')
      .populate('equipement', 'idEquipement nom localisation')

    if (!ot) return error(res, 'OT introuvable', 404)

    await notifierTechnicienAffecte(ot, req.user._id)

    logger.info(`OT ${ot.idOT} affecté au technicien ${technicienId}`)
    return success(res, { ot }, 'Technicien affecté')
  } catch (err) { next(err) }
}

// PUT /api/ordres-travail/:id/demarrer
exports.demarrer = async (req, res, next) => {
  try {
    const ot = await OrdreTravail.findById(req.params.id)
    if (!ot) return error(res, 'OT introuvable', 404)
    if (!['open', 'planned'].includes(ot.statut)) {
      return error(res, `Impossible de démarrer un OT en statut '${ot.statut}'`, 400)
    }

    ot.statut = 'in_progress'
    ot.dateDebut = new Date()
    await ot.save()

    return success(res, { ot }, 'Intervention démarrée')
  } catch (err) { next(err) }
}

// PUT /api/ordres-travail/:id/cloturer (Clôture et Recalcul Automatique des KPI Équipement)
exports.cloturer = async (req, res, next) => {
  try {
    const { resultat, causePanne, travailRealise, recommandations, tempsReel } = req.body
    const ot = await OrdreTravail.findById(req.params.id).populate('equipement')
    
    if (!ot) return error(res, 'OT introuvable', 404)
    if (ot.statut === 'closed') return error(res, 'OT déjà clôturé', 400)

    // Enregistrement des données de clôture
    ot.statut = 'closed'
    ot.dateCloture = new Date()
    ot.dateFin = new Date()
    ot.tempsReel = tempsReel || ot.tempsEstime || 0
    ot.cloture = { resultat: resultat || 'resolved', causePanne, travailRealise, recommandations, tempsReel: ot.tempsReel }

    await ot.save()

    // 1. Remettre l'équipement en service si résolu
    if (resultat === 'resolved' || !resultat) {
      await Equipement.findByIdAndUpdate(ot.equipement._id, { etat: 'operational' })
    }

    // 2. RECALCUL AUTOMATIQUE DU MTTR / MTBF / DISPO REELLE DE LA MACHINE
    const eqId = ot.equipement._id
    const pannesCloses = await OrdreTravail.find({
      equipement: eqId,
      typeOT: 'corrective',
      statut: 'closed',
      tempsReel: { $exists: true }
    }).sort({ createdAt: 1 })

    const nbPannes = pannesCloses.length
    const tempsTotalArretHeures = pannesCloses.reduce((acc, current) => acc + (current.tempsReel || 0), 0) / 60

    const maintenant = new Date()
    const dateInstallation = ot.equipement.createdAt || (pannesCloses[0] ? pannesCloses[0].createdAt : maintenant)
    const dureeObservationHeures = Math.max(1, (maintenant.getTime() - dateInstallation.getTime()) / (3600 * 1000))

    const mttrReel = nbPannes > 0 ? +(tempsTotalArretHeures / nbPannes).toFixed(2) : 0
    const tempsFonctionnementHeures = dureeObservationHeures - tempsTotalArretHeures
    
    const mtbfReel = nbPannes > 0 && tempsFonctionnementHeures > 0 
      ? +(tempsFonctionnementHeures / nbPannes).toFixed(0) 
      : +(dureeObservationHeures).toFixed(0)

    const dispoReelle = Math.max(0, Math.min(100, +((tempsFonctionnementHeures / dureeObservationHeures) * 100).toFixed(1)))

    // Sauvegarde immédiate des métriques réelles dans la fiche de la machine
    await Equipement.findByIdAndUpdate(eqId, {
      mttr: mttrReel,
      mtbf: mtbfReel,
      disponibilite: dispoReelle,
      nbPannes: nbPannes
    })

    logger.info(`OT ${ot.idOT} clôturé. Métriques machine mises à jour -> MTTR: ${mttrReel}h, MTBF: ${mtbfReel}h, Dispo: ${dispoReelle}%`)
    return success(res, { ot }, `OT ${ot.idOT} clôturé avec succès`)
  } catch (err) { next(err) }
}

// PUT /api/ordres-travail/:id/escalader
exports.escalader = async (req, res, next) => {
  try {
    const { motif } = req.body
    const ot = await OrdreTravail.findById(req.params.id)
    if (!ot) return error(res, 'OT introuvable', 404)

    ot.statut = 'escalated'
    ot.dateEscalade = new Date()
    ot.escalade = { motif, escaladePar: req.user._id, dateEscalade: new Date() }
    ot.priorite = 'critical'
    await ot.save()

    logger.warn(`OT ${ot.idOT} escaladé – motif : ${motif}`)
    return success(res, { ot }, 'OT escaladé vers la direction')
  } catch (err) { next(err) }
}

// POST /api/ordres-travail/:id/pieces (Consommer pièce avec transaction logique)
exports.consommerPiece = async (req, res, next) => {
  try {
    const { pieceId, quantite = 1 } = req.body
    const ot = await OrdreTravail.findById(req.params.id)
    const piece = await PieceDetachee.findById(pieceId)

    if (!ot) return error(res, 'OT introuvable', 404)
    if (!piece) return error(res, 'Pièce introuvable', 404)
    if (piece.quantiteStock < quantite) {
      return error(res, `Stock insuffisant (${piece.quantiteStock} unités disponibles)`, 400)
    }

    // Décrémenter le stock via la méthode du modèle
    await piece.consommer(quantite, ot._id, req.user._id)

    // Enregistrement de la ligne de consommation et mise à jour du coût global de l'OT
    ot.piecesConsommees.push({ piece: pieceId, quantite })
    ot.coutPieces = (ot.coutPieces || 0) + (piece.prixUnitaire * quantite)
    
    // Le coût total de l'OT intègre le coût des pièces détachées
    ot.coutTotal = (ot.coutMainOeuvre || 0) + ot.coutPieces
    await ot.save()

    return success(res, { piece, ot }, 'Pièce consommée et coût total de l’OT mis à jour')
  } catch (err) { next(err) }
}

// DELETE /api/ordres-travail/:id
exports.deleteOT = async (req, res, next) => {
  try {
    const ot = await OrdreTravail.findByIdAndDelete(req.params.id)
    if (!ot) return error(res, 'Ordre de travail introuvable', 404)

    if (ot.typeOT === 'corrective') {
      await Equipement.findByIdAndUpdate(ot.equipement, { etat: 'operational' })
    }

    logger.warn(`OT supprimé : ${ot.idOT} par l'utilisateur ${req.user._id}`)
    return success(res, null, `L'ordre de travail ${ot.idOT} a été supprimé`)
  } catch (err) { next(err) }
}