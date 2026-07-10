const PieceDetachee = require('../models/PieceDetachee')
const Notification = require('../models/Notification')
const { success, error, paginated } = require('../utils/apiResponse')
const logger = require('../utils/logger')
const { nextCode } = require('../utils/idSequence')

function populatePiece(query) {
  return query
    .populate('equipementsCompatibles', 'nom idEquipement localisation')
    .populate('historique.ordreTravauxId', 'idOT typeOT datePlanifiee')
    .populate('historique.technicien', 'nom prenom initiales')
}


// GET /api/pieces
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, categorie, search, stockBas } = req.query
    const filter = { actif: true }
    
    if (categorie) filter.categorie = categorie
    if (search) {
      filter.$or = [
        { nomPiece:  { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ]
    }
    if (stockBas === 'true') filter.$expr = { $lte: ['$quantiteStock', '$seuilAlerte'] }

    // Requêtes parallèles et optimisées avec .lean()
    const [data, total] = await Promise.all([
      PieceDetachee.find(filter)
        .populate('equipementsCompatibles', 'nom idEquipement')
        .sort({ nomPiece: 1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      PieceDetachee.countDocuments(filter)
    ])

    return paginated(res, data, total, Number(page), Number(limit), 'Pièces récupérées')
  } catch (err) { next(err) }
}

// GET /api/pieces/:id
exports.getOne = async (req, res, next) => {
  try {
    const piece = await populatePiece(PieceDetachee.findById(req.params.id)).lean()

    if (!piece) return error(res, 'Pièce introuvable', 404)
    return success(res, { piece })
  } catch (err) { next(err) }
}

// POST /api/pieces
exports.create = async (req, res, next) => {
  try {
    if (!req.body.idPiece) {
      req.body.idPiece = await nextCode('PieceDetachee', 'idPiece', 'P-', 4, 'P')
    }

    const piece = await PieceDetachee.create(req.body)
    logger.info(`Pièce créée : ${piece.reference} – ${piece.nomPiece}`)
    return success(res, { piece }, 'Pièce créée', 201)
  } catch (err) { next(err) }
}

// PUT /api/pieces/:id
exports.update = async (req, res, next) => {
  try {
    const piece = await PieceDetachee.findById(req.params.id)
    if (!piece) return error(res, 'Pièce introuvable', 404)

    Object.assign(piece, req.body)
    await piece.save()

    const populated = await populatePiece(PieceDetachee.findById(piece._id)).lean()
    return success(res, { piece: populated }, 'Pièce mise à jour')
  } catch (err) { next(err) }
}

// DELETE /api/pieces/:id (soft delete)
exports.delete = async (req, res, next) => {
  try {
    const piece = await PieceDetachee.findByIdAndUpdate(req.params.id, { actif: false }, { new: true })
    if (!piece) return error(res, 'Pièce introuvable', 404)
    return success(res, {}, 'Pièce désactivée')
  } catch (err) { next(err) }
}

// PUT /api/pieces/:id/consommer
exports.consommer = async (req, res, next) => {
  try {
    const quantite = Number(req.body.quantite)
    if (!quantite || quantite <= 0) return error(res, 'Quantite invalide', 400)

    const piece = await PieceDetachee.findById(req.params.id)
    if (!piece) return error(res, 'Piece introuvable', 404)
    if (piece.quantiteStock < quantite) return error(res, 'Stock insuffisant', 400)

    piece.quantiteStock -= quantite
    piece.historique.push({
      type: 'consommation',
      quantite,
      technicien: req.user?._id,
      observation: req.body.observation || '',
    })
    await piece.save()

    const populated = await populatePiece(PieceDetachee.findById(piece._id)).lean()
    logger.info(`Consommation piece ${piece.reference} : -${quantite}`)
    return success(res, { piece: populated }, 'Consommation enregistree')
  } catch (err) { next(err) }
}

// PUT /api/pieces/:id/commander
exports.commander = async (req, res, next) => {
  try {
    const quantite = Number(req.body.quantite)
    if (!quantite || quantite <= 0) return error(res, 'Quantite invalide', 400)

    const piece = await PieceDetachee.findById(req.params.id)
    if (!piece) return error(res, 'Piece introuvable', 404)

    piece.historique.push({
      type: 'commande',
      quantite,
      technicien: req.user?._id,
      observation: req.body.observation || '',
    })
    await piece.save()

    await Notification.create({
      type: 'piece_commande',
      titre: 'Commande piece detachee',
      message: `Commande de ${quantite} ${piece.unite} pour ${piece.nomPiece}`,
      cibleRole: 'admin',
      creePar: req.user?._id,
      donnees: { piece: piece._id, quantite },
    })

    const populated = await populatePiece(PieceDetachee.findById(piece._id)).lean()
    logger.info(`Commande piece ${piece.reference} : ${quantite}`)
    return success(res, { piece: populated }, 'Commande enregistree')
  } catch (err) { next(err) }
}

// PUT /api/pieces/:id/reapprovisionner
exports.reapprovisionner = async (req, res, next) => {
  try {
    const quantite = Number(req.body.quantite)
    if (!quantite || quantite <= 0) return error(res, 'Quantite invalide', 400)

    const piece = await PieceDetachee.findById(req.params.id)
    if (!piece) return error(res, 'Piece introuvable', 404)

    const ancienStock = piece.quantiteStock
    piece.quantiteStock += quantite
    piece.historique.push({
      type: 'commande',
      quantite,
      technicien: req.user?._id,
      observation: req.body.observation || '',
    })
    await piece.save()

    const populated = await populatePiece(PieceDetachee.findById(piece._id)).lean()
    logger.info(`Reapprovisionnement ${piece.reference} : +${quantite}`)
    return success(res, { piece: populated, ancienStock, nouveauStock: piece.quantiteStock }, 'Stock mis a jour')
  } catch (err) { next(err) }
}

// GET /api/pieces/alertes-stock
exports.alertesStock = async (req, res, next) => {
  try {
    const pieces = await PieceDetachee.find({
      actif: true,
      $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] },
    }).sort({ quantiteStock: 1 }).lean()

    return success(res, { pieces, count: pieces.length }, 'Alertes stock récupérées')
  } catch (err) { next(err) }
}