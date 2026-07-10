const CapteurIoT   = require('../models/CapteurIoT')
const AlerteIA     = require('../models/AlerteIA')
const OrdreTravail = require('../models/OrdreTravail')
const Equipement   = require('../models/Equipement')
const { success, error } = require('../utils/apiResponse')
const logger = require('../utils/logger')

// GET /api/capteurs
exports.getAll = async (req, res, next) => {
  try {
    const { equipement, niveau, actif } = req.query
    const filter = {}
    
    // Filtre simple et flexible
    if (actif !== undefined) filter.actif = actif === 'true'
    if (equipement) filter.equipement = equipement
    if (niveau)     filter.niveau     = niveau

    const capteurs = await CapteurIoT.find(filter)
      .populate('equipement', 'nom idEquipement localisation etat')
      .sort({ niveau: -1, idCapteur: 1 })

    return success(res, { capteurs, count: capteurs.length })
  } catch (err) { next(err) }
}

// GET /api/capteurs/:id
exports.getOne = async (req, res, next) => {
  try {
    const capteur = await CapteurIoT.findById(req.params.id).populate('equipement', 'nom idEquipement localisation')
    if (!capteur) return error(res, 'Capteur introuvable', 404)
    return success(res, { capteur })
  } catch (err) { next(err) }
}

// POST /api/capteurs
exports.create = async (req, res, next) => {
  try {
    const capteur = await CapteurIoT.create(req.body)
    return success(res, { capteur }, 'Capteur créé', 201)
  } catch (err) { next(err) }
}

// PUT /api/capteurs/:id
exports.update = async (req, res, next) => {
  try {
    const capteur = await CapteurIoT.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!capteur) return error(res, 'Capteur introuvable', 404)
    return success(res, { capteur }, 'Capteur mis à jour')
  } catch (err) { next(err) }
}

// POST /api/capteurs/:id/mesure
exports.enregistrerMesure = async (req, res, next) => {
  try {
    const { valeur } = req.body
    if (valeur === undefined) return error(res, 'valeur requise', 400)

    const capteur = await CapteurIoT.findById(req.params.id).populate('equipement')
    if (!capteur) return error(res, 'Capteur introuvable', 404)

    const niveauAvant = capteur.niveau
    await capteur.enregistrerMesure(Number(valeur))

    let alerte = null

    // Déclenchement du flux si anomalie détectée
    if (capteur.niveau !== 'ok' && niveauAvant === 'ok') {
      const isCrit = capteur.niveau === 'crit'

      alerte = await AlerteIA.create({
        niveau:          isCrit ? 3 : 2,
        equipement:      capteur.equipement._id,
        capteurs:        [capteur._id],
        description:     `Anomalie détectée sur ${capteur.typeCapteur} – Valeur: ${valeur} ${capteur.unite} (seuil: ${capteur.seuilAlerte})`,
        scoreConfiance:  isCrit ? 0.92 : 0.75,
        modele:          'Seuil dynamique IoT',
        delaiPrevu:      isCrit ? '< 2h' : '24–48h',
        delaiHeures:     isCrit ? 2 : 36,
        severite:        isCrit ? 'critical' : 'high',
        typeDonnee:      capteur.typeCapteur,
        seuilPrediction: capteur.seuilAlerte,
      })

      // Traitement automatique si niveau critique
      if (isCrit) {
        const ot = await OrdreTravail.create({
          typeOT:        'corrective',
          priorite:      'critical',
          statut:        'open',
          equipement:    capteur.equipement._id,
          titre:         `Intervention urgente – ${capteur.equipement.nom}`,
          description:   `OT généré automatiquement par IoT. ${capteur.typeCapteur} = ${valeur} ${capteur.unite}`,
          datePlanifiee: new Date(),
          tempsEstime:   120,
          declencheurIA: { modele: 'Seuil IoT', scoreConfiance: 0.92, alerteId: alerte._id },
        })
        
        alerte.otGenere = ot._id
        await alerte.save()
        
        await Equipement.findByIdAndUpdate(capteur.equipement._id, { etat: 'failure' })
        logger.warn(`OT urgent auto-créé : ${ot.idOT}`)
      }
    }

    return success(res, { capteur, alerte }, 'Mesure enregistrée')
  } catch (err) { next(err) }
}

// GET /api/capteurs/:id/historique
exports.getHistorique = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 100
    const capteur = await CapteurIoT.findById(req.params.id, 'historique')
    if (!capteur) return error(res, 'Capteur introuvable', 404)

    const historique = capteur.historique.slice(-limit)
    return success(res, { historique, count: historique.length })
  } catch (err) { next(err) }
}

// GET /api/capteurs/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    // Exécution en parallèle pour de bien meilleures performances
    const [total, ok, warn, crit, alertes, capteursCrit] = await Promise.all([
      CapteurIoT.countDocuments({ actif: true }),
      CapteurIoT.countDocuments({ actif: true, niveau: 'ok' }),
      CapteurIoT.countDocuments({ actif: true, niveau: 'warn' }),
      CapteurIoT.countDocuments({ actif: true, niveau: 'crit' }),
      AlerteIA.countDocuments({ statut: 'active' }),
      CapteurIoT.find({ actif: true, niveau: { $ne: 'ok' } })
        .populate('equipement', 'nom localisation')
        .sort({ niveau: -1 })
        .limit(10)
    ])

    return success(res, { total, ok, warn, crit, alertesActives: alertes, capteursCrit })
  } catch (err) { next(err) }
}