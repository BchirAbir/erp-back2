const Equipement   = require('../models/Equipement')
const OrdreTravail = require('../models/OrdreTravail')
const { success, error, paginated } = require('../utils/apiResponse')

// GET /api/equipements
exports.getAll = async (req, res, next) => {
  try {
    const { page=1, limit=20, etat, type, search } = req.query
    const filter = { actif: true }
    if (etat)   filter.etat = etat
    if (type)   filter.type = type
    if (search) filter.$or  = [
      { nom:          { $regex: search, $options: 'i' } },
      { localisation: { $regex: search, $options: 'i' } },
      { idEquipement: { $regex: search, $options: 'i' } },
    ]

    const total = await Equipement.countDocuments(filter)
    const data  = await Equipement.find(filter)
      .sort({ nom: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    return paginated(res, data, total, page, limit, 'Équipements récupérés')
  } catch (err) { next(err) }
}

// GET /api/equipements/:id
exports.getOne = async (req, res, next) => {
  try {
    const eq = await Equipement.findById(req.params.id)
    if (!eq) return error(res, 'Équipement introuvable', 404)
    return success(res, { equipement: eq })
  } catch (err) { next(err) }
}

// POST /api/equipements
exports.create = async (req, res, next) => {
  try {
    const eq = await Equipement.create(req.body)
    return success(res, { equipement: eq }, 'Équipement créé', 201)
  } catch (err) { next(err) }
}

// PUT /api/equipements/:id
exports.update = async (req, res, next) => {
  try {
    const eq = await Equipement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!eq) return error(res, 'Équipement introuvable', 404)
    return success(res, { equipement: eq }, 'Équipement mis à jour')
  } catch (err) { next(err) }
}

// DELETE /api/equipements/:id  (soft delete)
exports.delete = async (req, res, next) => {
  try {
    const eq = await Equipement.findByIdAndUpdate(req.params.id, { actif: false }, { new: true })
    if (!eq) return error(res, 'Équipement introuvable', 404)
    return success(res, {}, 'Équipement désactivé')
  } catch (err) { next(err) }
}

// GET /api/equipements/:id/historique  – historique OT de l'équipement
exports.getHistorique = async (req, res, next) => {
  try {
    const { page=1, limit=10 } = req.query
    const total = await OrdreTravail.countDocuments({ equipement: req.params.id })
    const ots   = await OrdreTravail.find({ equipement: req.params.id })
      .populate('technicien', 'nom prenom initiales color')
      .sort({ datePlanifiee: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
    return paginated(res, ots, total, page, limit, 'Historique récupéré')
  } catch (err) { next(err) }
}

// GET /api/equipements/:id/kpi  – KPIs calculés (MTBF, MTTR, disponibilité)
// GET /api/equipements/:id/kpi – VRAIS KPIs calculés depuis la BDD
exports.getKPI = async (req, res, next) => {
  try {
    const eq = await Equipement.findById(req.params.id)
    if (!eq) return error(res, 'Équipement introuvable', 404)

    // 1. Récupérer tous les ordres de travail fermés pour cet équipement
    const ots = await OrdreTravail.find({ equipement: req.params.id, statut: 'closed' })

    // 2. Isoler les pannes (correctives)
    const pannes   = ots.filter(o => o.typeOT === 'corrective')
    const nbPannes = pannes.length

    // 3. Temps total d'arrêt (Somme des durées de pannes convertie en heures)
    const tempsArretMinutes = pannes.reduce((sum, o) => sum + (o.tempsReel || o.tempsEstime || 0), 0)
    const tempsArretHeures  = tempsArretMinutes / 60

    // 4. Calcul de la période réelle d'observation (en heures depuis la création en BDD)
    const dateCreation  = new Date(eq.createdAt || new Date())
    const maintenant    = new Date()
    const dureeVieHeures = Math.max(1, (maintenant - dateCreation) / (1000 * 60 * 60)) // Évite la division par 0

    // 5. Calculs des KPIs réels
    const mttr = nbPannes > 0 ? Number((tempsArretHeures / nbPannes).toFixed(2)) : 0

    // Temps de bon fonctionnement = Temps total vécu - Temps passé en panne
    const tempsFonctionnement = Math.max(0, dureeVieHeures - tempsArretHeures)
    const mtbf = nbPannes > 0 ? Number((tempsFonctionnement / nbPannes).toFixed(0)) : Number(dureeVieHeures.toFixed(0))

    // Disponibilité réelle (%)
    const disponibilite = Number(((tempsFonctionnement / dureeVieHeures) * 100).toFixed(1))

    // 6. Sauvegarde directe dans l'équipement
    eq.mtbf = mtbf
    eq.mttr = mttr
    eq.disponibilite = disponibilite
    eq.nbPannes = nbPannes
    await eq.save()

    return success(res, { 
      mtbf, 
      mttr, 
      disponibilite, 
      nbPannes, 
      totalOT: ots.length,
      heuresObservation: Math.round(dureeVieHeures) 
    })
  } catch (err) { next(err) }
}