const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const GmaoUser = require('../models/User')
const ErpUser = require('../../../models/User')

const VALID_ROLES = ['manager', 'technician', 'admin']

function mapErpRoleToGmao(role) {
  if (role === 'ADMIN') return 'admin'
  if (role === 'MAINTENANCE_MANAGER' || role === 'PRODUCTION_MANAGER') return 'manager'
  return 'technician'
}

function splitErpName(erpUser) {
  const raw = String(erpUser.name || erpUser.email || 'Utilisateur ERP').trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  return {
    prenom: parts[0] || 'Utilisateur',
    nom: parts.slice(1).join(' ') || 'ERP',
  }
}

async function syncErpUserToGmao(erpUser) {
  const email = String(erpUser.email || '').toLowerCase().trim()
  if (!email) return null

  const { prenom, nom } = splitErpName(erpUser)
  const update = {
    prenom,
    nom,
    email,
    role: mapErpRoleToGmao(erpUser.role),
    telephone: erpUser.phone || undefined,
    adresse: erpUser.address || undefined,
    cin: erpUser.cin || undefined,
    departement: erpUser.department || 'Maintenance',
    actif: erpUser.status !== 'Inactive',
  }

  const existing = await GmaoUser.findOne({ email }).select('-password')
  if (existing) {
    return GmaoUser.findByIdAndUpdate(existing._id, { $set: update }, { new: true, runValidators: false }).select('-password')
  }

  const created = await GmaoUser.create({
    ...update,
    password: crypto.randomBytes(24).toString('hex'),
  })

  return GmaoUser.findById(created._id).select('-password')
}

async function resolveAuthenticatedUser(decoded) {
  let user = await GmaoUser.findById(decoded.id).select('-password')
  if (user) return user

  const erpUser = await ErpUser.findById(decoded.id).select('-password')
  if (!erpUser) return null

  return syncErpUserToGmao(erpUser)
}

async function protect(request, reply) {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, message: 'Acces refuse - token manquant' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await resolveAuthenticatedUser(decoded)

    if (!user || !user.actif) {
      return reply.code(401).send({ success: false, message: 'Utilisateur introuvable ou desactive' })
    }
    if (!VALID_ROLES.includes(user.role)) {
      return reply.code(403).send({ success: false, message: 'Role utilisateur non autorise' })
    }
    request.user = user
  } catch (err) {
    return reply.code(401).send({ success: false, message: err.name === 'TokenExpiredError' ? 'Token expire' : 'Token invalide' })
  }
}

function authorize(...roles) {
  return async function roleGuard(request, reply) {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({ success: false, message: `Role '${request.user?.role || ''}' non autorise pour cette action` })
    }
  }
}

module.exports = { protect, authorize }
