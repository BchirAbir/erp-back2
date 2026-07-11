const AnalysePanne = require('../models/AnalysePanne');
const ConformiteReglementaire = require('../models/ConformiteReglementaire');
const MaintenancePreventive = require('../models/MaintenancePreventive');
const Equipement = require('../models/Equipement');
const { success, error } = require('../utils/apiResponse');

/**
 * Récupère les données globales du tableau de bord GMAO Expert
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const [analyses, conformites, plansPreventifs] = await Promise.all([
      AnalysePanne.find().populate('equipement', 'nom idEquipement localisation').sort({ createdAt: -1 }).limit(50),
      ConformiteReglementaire.find().populate('equipement', 'nom idEquipement localisation').sort({ dateEcheance: 1 }).limit(50),
      MaintenancePreventive.find({ actif: true }).populate('equipement', 'nom idEquipement localisation').sort({ dateProchaine: 1 }).limit(50),
    ]);

    const now = new Date();
    const expired = conformites.filter(c => c.statut === 'expired' || new Date(c.dateEcheance) < now).length;
    
    const dueSoon = conformites.filter(c => {
      const days = (new Date(c.dateEcheance).getTime() - Date.now()) / (24 * 3600 * 1000);
      return days >= 0 && days <= 30;
    }).length;

    return success(res, {
      analyses,
      conformites,
      plansPreventifs,
      stats: {
        analysesOuvertes: analyses.filter(a => a.statut !== 'closed').length,
        conformitesExpirees: expired,
        conformitesProches: dueSoon,
      },
    });
  } catch (err) { 
    next(err); 
  }
};

/**
 * Cree une analyse FMEA.
 */
exports.createAnalyse = async (req, res, next) => {
  try {
    const payload = await buildFmeaPayload(req.body, req.user._id);
    const item = await AnalysePanne.create(payload);
    const populated = await AnalysePanne.findById(item._id).populate('equipement', 'nom idEquipement localisation');

    return success(res, { analyse: populated }, 'Analyse FMEA creee', 201);
  } catch (err) {
    return error(res, err.message || 'Creation impossible', 400);
  }
};

exports.updateAnalyse = async (req, res, next) => {
  try {
    const item = await AnalysePanne.findById(req.params.id);
    if (!item) return error(res, 'Analyse FMEA introuvable', 404);

    Object.assign(item, await buildFmeaPayload(req.body, item.creePar));
    await item.save();
    const populated = await AnalysePanne.findById(item._id).populate('equipement', 'nom idEquipement localisation');

    return success(res, { analyse: populated }, 'Analyse FMEA modifiee');
  } catch (err) {
    return error(res, err.message || 'Modification impossible', 400);
  }
};

exports.deleteAnalyse = async (req, res, next) => {
  try {
    const item = await AnalysePanne.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Analyse FMEA introuvable', 404);

    return success(res, {}, 'Analyse FMEA supprimee');
  } catch (err) {
    return error(res, err.message || 'Suppression impossible', 400);
  }
};

function readFmeaScore(value, label) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error(label + ' FMEA doit etre entre 1 et 10');
  }
  return score;
}

function normalizeFmeaStatus(value) {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return ['Brouillon', 'Validee', 'En action', 'Cloturee'].includes(normalized) ? normalized : 'Brouillon';
}

async function buildFmeaPayload(body, userId) {
  const required = ['equipement', 'titre', 'composant', 'fonction', 'modeDefaillance', 'effet', 'cause', 'actionRecommandee', 'responsable', 'dateAnalyse', 'dateEcheance'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === '') throw new Error('Champs FMEA obligatoires incomplets');
  }

  const gravite = readFmeaScore(body.gravite, 'Gravite');
  const occurrence = readFmeaScore(body.occurrence, 'Occurrence');
  const detection = readFmeaScore(body.detection, 'Detection');

  const dateAnalyse = new Date(body.dateAnalyse);
  const dateEcheance = new Date(body.dateEcheance);
  if (Number.isNaN(dateAnalyse.getTime()) || Number.isNaN(dateEcheance.getTime())) throw new Error('Dates FMEA invalides');
  if (dateEcheance < dateAnalyse) throw new Error('La date echeance doit etre superieure ou egale a la date analyse');

  const equipement = await Equipement.findById(body.equipement).select('nom idEquipement');
  if (!equipement) throw new Error('Equipement introuvable');

  const statutFmea = normalizeFmeaStatus(body.statutFmea);

  return {
    equipement: body.equipement,
    equipementId: equipement.idEquipement,
    equipementNom: equipement.nom,
    titre: String(body.titre).trim(),
    composant: String(body.composant).trim(),
    fonction: String(body.fonction).trim(),
    modeDefaillance: String(body.modeDefaillance).trim(),
    effet: String(body.effet).trim(),
    cause: String(body.cause).trim(),
    gravite,
    occurrence,
    detection,
    actionRecommandee: String(body.actionRecommandee).trim(),
    responsable: String(body.responsable).trim(),
    statutFmea,
    dateAnalyse,
    dateEcheance,
    commentaire: body.commentaire ? String(body.commentaire).trim() : '',
    methode: 'FMEA',
    causeRacine: String(body.cause).trim(),
    actions: String(body.actionRecommandee).trim(),
    statut: statutFmea === 'Cloturee' ? 'closed' : statutFmea === 'En action' ? 'in_progress' : 'open',
    creePar: userId,
  };
}

/**
 * Crée un nouveau contrôle ou suivi de conformité réglementaire
 */
exports.createConformite = async (req, res, next) => {
  try {
    const { equipement, typeControle, dateEcheance, statut, dateDerniere } = req.body;
    if (!equipement || !typeControle || !dateEcheance) {
      return error(res, 'Équipement, type de contrôle et date d\'échéance requis', 400);
    }

    const statutMap = {
      a_planifier: 'due_soon',
      conforme: 'valid',
      expire: 'expired',
      valid: 'valid',
      due_soon: 'due_soon',
      expired: 'expired',
    };

    const payload = {
      ...req.body,
      statut: statutMap[statut] || 'valid',
    };
    
    if (!dateDerniere) delete payload.dateDerniere;

    const item = await ConformiteReglementaire.create(payload);
    const populated = await ConformiteReglementaire.findById(item._id).populate('equipement', 'nom idEquipement localisation');
    
    return success(res, { conformite: populated }, 'Contrôle réglementaire créé', 201);
  } catch (err) { 
    next(err); 
  }
};

/**
 * Supprime un controle de conformite.
 */
exports.deleteConformite = async (req, res, next) => {
  try {
    const item = await ConformiteReglementaire.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Controle de conformite introuvable', 404);

    return success(res, {}, 'Controle de conformite supprime');
  } catch (err) {
    next(err);
  }
};
