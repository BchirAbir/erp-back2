const User = require('../models/User')
const OrdreTravail = require('../models/OrdreTravail')
const Notification = require('../models/Notification')
const { success, error, paginated } = require('../utils/apiResponse')

function generateTechnicianPassword() {
  return `tech${Math.floor(100000 + Math.random() * 900000)}`
}

function generateManagerPassword() {
  return `resp${Math.floor(100000 + Math.random() * 900000)}`
}

// POST /api/users/responsables - creation par admin uniquement
exports.createResponsable = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, adresse, cin, departement, habilitations, certifications, planningIntervention, astreintes } = req.body
    const password = req.body.password || generateManagerPassword()
    const normalizedEmail = email?.trim().toLowerCase()

    if (!nom || !prenom || !normalizedEmail) {
      return error(res, 'Nom, prenom et email requis', 400)
    }

    const exists = await User.findOne({ email: normalizedEmail })
    if (exists) return error(res, 'Email deja utilise', 409)

    const user = await User.create({
      nom,
      prenom,
      email: normalizedEmail,
      password,
      telephone,
      adresse,
      cin,
      departement: departement || 'Maintenance',
      habilitations,
      certifications,
      planningIntervention,
      astreintes,
      role: 'manager',
      disponibilite: true,
      charge: 0,
      actif: true,
      color: '#2563EB',
    })

    return success(res, {
      user: { ...user.toJSON(), password: undefined },
      credentials: { email: normalizedEmail, password },
    }, 'Session responsable maintenance creee', 201)
  } catch (err) { next(err) }
}

exports.getResponsables = async (req, res, next) => {
  try {
    const responsables = await User.find({ role: 'manager', actif: true })
      .sort({ nom: 1 })
      .lean()
    return success(res, { responsables, count: responsables.length })
  } catch (err) { next(err) }
}

// POST /api/users/techniciens - creation par admin/responsable
exports.createTechnicien = async (req, res, next) => {
  try {
    const { nom, prenom, email, specialite, telephone, adresse, cin, departement, habilitations, certifications, planningIntervention, astreintes } = req.body
    const password = req.body.password || generateTechnicianPassword()
    const normalizedEmail = email?.trim().toLowerCase()

    if (!nom || !prenom || !normalizedEmail) {
      return error(res, 'Nom, prenom et email requis', 400)
    }

    const exists = await User.findOne({ email: normalizedEmail }).select('+password')
    if (exists?.actif) return error(res, 'Email deja utilise', 409)

    let user
    if (exists) {
      exists.nom = nom
      exists.prenom = prenom
      exists.email = normalizedEmail
      exists.password = password
      exists.specialite = specialite
      exists.telephone = telephone
      exists.adresse = adresse
      exists.cin = cin
      exists.departement = departement
      exists.habilitations = habilitations
      exists.certifications = certifications
      exists.planningIntervention = planningIntervention
      exists.astreintes = astreintes
      exists.role = 'technician'
      exists.disponibilite = true
      exists.charge = 0
      exists.actif = true
      user = await exists.save()
    } else {
      user = await User.create({
        nom,
        prenom,
        email: normalizedEmail,
        password,
        specialite,
        telephone,
        adresse,
        cin,
        departement,
        habilitations,
        certifications,
        planningIntervention,
        astreintes,
        role: 'technician',
        disponibilite: true,
        charge: 0,
        actif: true,
      })
    }

    if (req.user?.role === 'manager') {
      await Notification.create({
        type: 'technicien_created',
        titre: 'Nouveau technicien cree par responsable',
        message: `${req.user.prenom} ${req.user.nom} a cree la session technicien ${prenom} ${nom}.`,
        cibleRole: 'admin',
        creePar: req.user._id,
        technicien: user._id,
        donnees: {
          email: normalizedEmail,
          password,
          adresse,
          telephone,
          cin,
          departement,
          specialite,
          habilitations,
          certifications,
          planningIntervention,
          astreintes,
        },
      })
    }

    return success(res, {
      user: { ...user.toJSON(), password: undefined },
      credentials: { email: normalizedEmail, password },
    }, 'Session technicien creee et identifiants generes', 201)
  } catch (err) { next(err) }
}

// GET /api/users
exports.getAll = async (req, res, next) => {
  try {
    const { role, disponibilite, search, page=1, limit=20 } = req.query
    const filter = { actif: true }
    if (role)          filter.role = role
    if (disponibilite !== undefined) filter.disponibilite = disponibilite === 'true'
    if (search)        filter.$or  = [
      { nom:    { $regex: search, $options: 'i' } },
      { prenom: { $regex: search, $options: 'i' } },
      { email:  { $regex: search, $options: 'i' } },
    ]

    const total = await User.countDocuments(filter)
    const data  = await User.find(filter)
      .sort({ nom: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    return paginated(res, data, total, page, limit, 'Utilisateurs rÃ©cupÃ©rÃ©s')
  } catch (err) { next(err) }
}

// GET /api/users/techniciens  â€“ liste techniciens disponibles
exports.getTechniciens = async (req, res, next) => {
  try {
    const lundi = new Date()
    lundi.setDate(lundi.getDate() - lundi.getDay() + 1)
    lundi.setHours(0, 0, 0, 0)
    const dimanche = new Date(lundi)
    dimanche.setDate(dimanche.getDate() + 6)
    dimanche.setHours(23, 59, 59, 999)

    const techniciens = await User.find({ role: 'technician', actif: true })
      .sort({ disponibilite: -1, charge: 1 })
      .lean()

    const data = await Promise.all(techniciens.map(async (tech) => {
      const ots = await OrdreTravail.find({
        technicien: tech._id,
        datePlanifiee: { $gte: lundi, $lte: dimanche },
        statut: { $ne: 'cancelled' },
      }).select('tempsEstime')

      const tempsTotal = ots.reduce((sum, ot) => sum + (ot.tempsEstime || 0), 0)
      const charge = Math.min(100, Math.round((tempsTotal / (7 * 8 * 60)) * 100))
      return { ...tech, charge }
    }))

    return success(res, { techniciens: data, count: data.length })
  } catch (err) { next(err) }
}

// GET /api/users/:id
exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return error(res, 'Utilisateur introuvable', 404)
    return success(res, { user })
  } catch (err) { next(err) }
}

// GET /api/users/:id/planning  â€“ OT du technicien pour la semaine
exports.getPlanning = async (req, res, next) => {
  try {
    const lundi = new Date()
    lundi.setDate(lundi.getDate() - lundi.getDay() + 1)
    lundi.setHours(0, 0, 0, 0)
    const vendredi = new Date(lundi)
    vendredi.setDate(vendredi.getDate() + 4)
    vendredi.setHours(23, 59, 59, 999)

    const ots = await OrdreTravail.find({
      technicien:    req.params.id,
      datePlanifiee: { $gte: lundi, $lte: vendredi },
      statut:        { $ne: 'closed' },
    })
      .populate('equipement', 'nom localisation')
      .sort({ datePlanifiee: 1 })

    const charge = ots.reduce((s, o) => s + (o.tempsEstime || 0), 0) / (5 * 8 * 60) * 100

    return success(res, { ots, charge: +charge.toFixed(0), semaine: { debut: lundi, fin: vendredi } })
  } catch (err) { next(err) }
}

// PUT /api/users/:id
exports.update = async (req, res, next) => {
  try {
    // Emp?cher modification du mot de passe via cette route
    delete req.body.password

    const existing = await User.findById(req.params.id)
    if (!existing) return error(res, 'Utilisateur introuvable', 404)

    if (req.user.role === 'manager' && existing.role !== 'technician') {
      return error(res, 'Seul un administrateur peut modifier un responsable maintenance', 403)
    }

    if (req.user.role === 'manager') {
      delete req.body.role
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    return success(res, { user }, 'Profil mis ? jour')
  } catch (err) { next(err) }
}

// PUT /api/users/:id/disponibilite  â€“ basculer disponibilitÃ© technicien
exports.setDisponibilite = async (req, res, next) => {
  try {
    const { disponibilite } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { disponibilite }, { new: true })
    if (!user) return error(res, 'Utilisateur introuvable', 404)
    return success(res, { user }, `DisponibilitÃ© mise Ã  jour : ${disponibilite}`)
  } catch (err) { next(err) }
}

// DELETE /api/users/:id
exports.delete = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) return error(res, 'Impossible de supprimer son propre compte', 400)
    const user = await User.findById(req.params.id)
    if (!user) return error(res, 'Utilisateur introuvable', 404)

    if (req.user.role === 'manager' && user.role !== 'technician') {
      return error(res, 'Seul un administrateur peut supprimer un responsable maintenance', 403)
    }

    if (user.role === 'technician') {
      await OrdreTravail.updateMany({ technicien: user._id }, { $unset: { technicien: '' }, $set: { statut: 'open' } })
      await User.deleteOne({ _id: user._id })
      return success(res, {}, 'Technicien supprime de la base de donnees')
    }

    user.actif = false
    await user.save({ validateBeforeSave: false })
    return success(res, {}, 'Utilisateur desactive')
  } catch (err) { next(err) }
}

