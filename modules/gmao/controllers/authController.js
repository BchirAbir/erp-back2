const jwt    = require('jsonwebtoken')
const User   = require('../models/User')
const { success, error } = require('../utils/apiResponse')
const logger = require('../utils/logger')

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' })

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { email, role } = req.body
    
    const exists = await User.findOne({ email })
    if (exists) return error(res, 'Email déjà utilisé', 409)

    // Création simple avec assignation du rôle par défaut si absent
    const user = await User.create({ ...req.body, role: role || 'technician' })
    const token = signToken(user._id)

    logger.info(`Nouvel utilisateur créé : ${email} (${user.role})`)
    
    // On convertit en objet JS et on s'assure que le password ne sorte pas
    const userResponse = user.toJSON()
    delete userResponse.password

    return success(res, { token, user: userResponse }, 'Compte créé avec succès', 201)
  } catch (err) { next(err) }
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return error(res, 'Email et mot de passe requis', 400)

    const user = await User.findOne({ email }).select('+password')
    if (!user || !user.actif)                    return error(res, 'Identifiants invalides', 401)
    if (!(await user.comparePassword(password))) return error(res, 'Identifiants invalides', 401)

    // Mise à jour de la dernière connexion sans déclencher les validations lourdes
    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })

    const token = signToken(user._id)
    logger.info(`Connexion : ${email}`)

    const userResponse = user.toJSON()
    delete userResponse.password

    return success(res, { token, user: userResponse }, 'Connexion réussie')
  } catch (err) { next(err) }
}

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user }, 'Profil récupéré')
  } catch (err) { next(err) }
}

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    const user = await User.findById(req.user._id).select('+password')
    if (!(await user.comparePassword(currentPassword))) return error(res, 'Mot de passe actuel incorrect', 401)
    
    user.password = newPassword
    await user.save()
    
    return success(res, {}, 'Mot de passe modifié')
  } catch (err) { next(err) }
}