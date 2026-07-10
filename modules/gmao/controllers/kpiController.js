const OrdreTravail            = require('../models/OrdreTravail')
const Equipement              = require('../models/Equipement')
const PieceDetachee           = require('../models/PieceDetachee')
const AlerteIA                = require('../models/AlerteIA')
const MaintenancePreventive   = require('../models/MaintenancePreventive')
const { success } = require('../utils/apiResponse')

// GET /api/kpi/dashboard  – KPIs globaux dashboard manager
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalEq, eqOperationnels, eqEnPanne, eqEnMaintenance,
      otOuverts, otEnCours, otPlanifies, otClos24h,
      alertesActives, capteursTotal,
      stockBas, totalPieces,
    ] = await Promise.all([
      Equipement.countDocuments({ actif: true }),
      Equipement.countDocuments({ actif: true, etat: 'operational' }),
      Equipement.countDocuments({ actif: true, etat: 'failure' }),
      Equipement.countDocuments({ actif: true, etat: 'maintenance' }),
      OrdreTravail.countDocuments({ statut: 'open' }),
      OrdreTravail.countDocuments({ statut: 'in_progress' }),
      OrdreTravail.countDocuments({ statut: 'planned' }),
      OrdreTravail.countDocuments({
        statut: 'closed',
        dateCloture: { $gte: new Date(Date.now() - 24*3600*1000) },
      }),
      AlerteIA.countDocuments({ statut: 'active' }),
      require('../models/CapteurIoT').countDocuments({ actif: true }),
      PieceDetachee.countDocuments({ actif: true, $expr: { $lte: ['$quantiteStock','$seuilAlerte'] } }),
      PieceDetachee.countDocuments({ actif: true }),
    ])

    // MTTR moyen (toutes les interventions closes)
    const otsClos = await OrdreTravail.find({ statut: 'closed', tempsReel: { $exists: true } })
    const mttrMoyen = otsClos.length
      ? (otsClos.reduce((s,o) => s + (o.tempsReel || 0), 0) / otsClos.length / 60).toFixed(1)
      : 0

    // Disponibilité moyenne parc
    const eqs = await Equipement.find({ actif: true }, 'disponibilite')
    const dispMoyenne = eqs.length
      ? (eqs.reduce((s,e) => s + e.disponibilite, 0) / eqs.length).toFixed(1)
      : 100

    // Compliance préventif
    const plans = await MaintenancePreventive.find({ actif: true })
    const complianceMoyenne = plans.length
      ? (plans.reduce((s,p) => s + (p.compliancePct || 100), 0) / plans.length).toFixed(0)
      : 100

    // Coût maintenance du mois
    const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0,0,0,0)
    const otsMois   = await OrdreTravail.find({ statut:'closed', dateCloture: { $gte: debutMois } })
    const coutMois  = otsMois.reduce((s,o) => s + (o.coutTotal || 0), 0)

    return success(res, {
      equipements:    { total: totalEq, operationnels: eqOperationnels, enPanne: eqEnPanne, enMaintenance: eqEnMaintenance },
      ordresTravail:  { ouverts: otOuverts, enCours: otEnCours, planifies: otPlanifies, clos24h: otClos24h },
      maintenance:    { mttrMoyen: Number(mttrMoyen), dispMoyenne: Number(dispMoyenne), complianceMoyenne: Number(complianceMoyenne), coutMois },
      iot:            { capteursActifs: capteursTotal, alertesActives },
      stocks:         { piecesStockBas: stockBas, totalPieces },
    })
  } catch (err) { next(err) }
}

// GET /api/kpi/mtbf-mttr  – MTBF et MTTR par équipement
/**
 * GET /api/kpi/mtbf-mttr – CALCULS RÉELS ET DYNAMIQUES
 * Basé sur l'historique de vie de l'équipement et des arrêts enregistrés
 */
exports.getMtbfMttr = async (req, res, next) => {
  try {
    // 1. On récupère les équipements actifs avec leur date de création (createdAt)
    const equipements = await Equipement.find(
      { actif: true }, 
      'idEquipement nom mtbf mttr disponibilite nbPannes createdAt'
    );

    const now = new Date();

    const result = await Promise.all(equipements.map(async (eq) => {
      // 2. Récupérer TOUTES les pannes closes pour cet équipement
      const pannes = await OrdreTravail.find({
        equipement: eq._id,
        typeOT: 'corrective',
        statut: 'closed',
        tempsReel: { $exists: true },
      }, 'tempsReel dateCloture createdAt').sort({ createdAt: 1 });

      const nbPannes = pannes.length;

      // 3. Temps total de réparation (Somme des temps réels d'intervention en minutes)
      const tempsRepareMinutes = pannes.reduce((s, o) => s + (o.tempsReel || 0), 0);
      const tempsRepareHeures = tempsRepareMinutes / 60;

      // 4. Durée d'observation RÉELLE (Temps écoulé depuis l'installation de la machine en heures)
      const dateInstallation = eq.createdAt || (pannes[0] ? pannes[0].createdAt : now);
      const dureeObservationHeures = Math.max(1, (now.getTime() - dateInstallation.getTime()) / (3600 * 1000));

      // 5. Calcul du MTTR Réel (Temps Moyen de Réparation)
      // Formule : Temps total d'arrêt pour panne / Nombre de pannes
      const mttrReel = nbPannes > 0 ? +(tempsRepareHeures / nbPannes).toFixed(2) : 0;

      // 6. Calcul du MTBF Réel (Temps Moyen entre Pannes)
      // Formule : (Temps total d'observation - Temps total en panne) / Nombre de pannes
      const tempsFonctionnementHeures = dureeObservationHeures - tempsRepareHeures;
      const mtbfReel = nbPannes > 0 && tempsFonctionnementHeures > 0 
        ? +(tempsFonctionnementHeures / nbPannes).toFixed(0) 
        : +(dureeObservationHeures).toFixed(0);

      // 7. Calcul de la Disponibilité Réelle (A)
      // Formule : (Temps de fonctionnement / Temps d'observation) * 100
      const dispoReelle = +((tempsFonctionnementHeures / dureeObservationHeures) * 100).toFixed(1);

      // 8. Sauvegarde optionnelle en base pour mettre à jour la fiche de l'équipement
      await Equipement.updateOne(
        { _id: eq._id },
        { 
          $set: { 
            mttr: mttrReel, 
            mtbf: mtbfReel, 
            disponibilite: Math.max(0, Math.min(100, dispoReelle)),
            nbPannes: nbPannes 
          } 
        }
      );

      return {
        equipement: { id: eq._id, idEquipement: eq.idEquipement, nom: eq.nom },
        mtbf: mtbfReel,
        mttr: mttrReel,
        disponibilite: Math.max(0, Math.min(100, dispoReelle)),
        nbPannes,
        details: {
          heuresObservation: +dureeObservationHeures.toFixed(0),
          heuresArret: +tempsRepareHeures.toFixed(1)
        }
      };
    }));

    return success(res, { kpis: result });
  } catch (err) { 
    next(err); 
  }
};

// GET /api/kpi/compliance  – compliance plan préventif par équipement
exports.getCompliance = async (req, res, next) => {
  try {
    const plans = await MaintenancePreventive.find({ actif: true })
      .populate('equipement', 'nom idEquipement')

    const result = plans.map(p => ({
      plan:             { id: p._id, idPlan: p.idPlan, nom: p.nom },
      equipement:       p.equipement,
      frequenceJours:   p.frequenceJours,
      dateProchaine:    p.dateProchaine,
      derniereMaint:    p.derniereMaintenance,
      compliancePct:    p.compliancePct,
      otGeneres:        p.otGeneres?.length || 0,
    }))

    const complianceMoyenne = result.length
      ? +(result.reduce((s,r) => s + r.compliancePct, 0) / result.length).toFixed(0)
      : 100

    return success(res, { plans: result, complianceMoyenne })
  } catch (err) { next(err) }
}

// GET /api/kpi/repartition-ot  – répartition OT par type / priorité / statut
exports.getRepartitionOT = async (req, res, next) => {
  try {
    const [parType, parPriorite, parStatut, evolution7j] = await Promise.all([
      OrdreTravail.aggregate([{ $group: { _id: '$typeOT',    count: { $sum: 1 } } }]),
      OrdreTravail.aggregate([{ $group: { _id: '$priorite',  count: { $sum: 1 } } }]),
      OrdreTravail.aggregate([{ $group: { _id: '$statut',    count: { $sum: 1 } } }]),
      // OT créés par jour sur les 7 derniers jours
      OrdreTravail.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*3600*1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ])

    return success(res, { parType, parPriorite, parStatut, evolution7j })
  } catch (err) { next(err) }
}

// GET /api/kpi/pareto-pannes - analyse Pareto des pannes par equipement
exports.getParetoPannes = async (req, res, next) => {
  try {
    const raw = await OrdreTravail.aggregate([
      { $match: { typeOT: 'corrective', statut: 'closed' } },
      {
        $group: {
          _id: '$equipement',
          count: { $sum: 1 },
          tempsArretMinutes: { $sum: { $ifNull: ['$tempsReel', '$tempsEstime'] } },
        },
      },
      { $lookup: { from: 'gmao_equipements', localField: '_id', foreignField: '_id', as: 'equipement' } },
      { $unwind: { path: '$equipement', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          equipementId: '$_id',
          equipement: { $ifNull: ['$equipement.nom', 'Equipement non renseigne'] },
          idEquipement: '$equipement.idEquipement',
          count: 1,
          tempsArretMinutes: 1,
        },
      },
      { $sort: { count: -1, tempsArretMinutes: -1, equipement: 1 } },
    ])

    const total = raw.reduce((sum, item) => sum + item.count, 0)
    let cumulCount = 0
    const pareto = raw.map((item, index) => {
      cumulCount += item.count
      return {
        rang: index + 1,
        equipementId: item.equipementId,
        equipement: item.equipement,
        idEquipement: item.idEquipement,
        count: item.count,
        tempsArretHeures: +((item.tempsArretMinutes || 0) / 60).toFixed(1),
        pourcentage: total ? +((item.count / total) * 100).toFixed(1) : 0,
        cumul: total ? +((cumulCount / total) * 100).toFixed(1) : 0,
      }
    })

    return success(res, { pareto, total }, 'Pareto des pannes par equipement charge')
  } catch (err) { next(err) }
}
// GET /api/kpi/couts  – analyse des coûts maintenance
exports.getCouts = async (req, res, next) => {
  try {
    const { periode = '30' } = req.query
    const debut = new Date(Date.now() - Number(periode) * 24 * 3600 * 1000)

    const [coutParType, coutParEquipement, coutTotal] = await Promise.all([
      OrdreTravail.aggregate([
        { $match: { statut: 'closed', dateCloture: { $gte: debut } } },
        { $group: { _id: '$typeOT', coutTotal: { $sum: '$coutTotal' }, count: { $sum: 1 } } },
      ]),
      OrdreTravail.aggregate([
        { $match: { statut: 'closed', dateCloture: { $gte: debut } } },
        { $group: { _id: '$equipement', coutTotal: { $sum: '$coutTotal' }, count: { $sum: 1 } } },
        { $lookup: { from: 'gmao_equipements', localField: '_id', foreignField: '_id', as: 'eq' } },
        { $unwind: '$eq' },
        { $project: { nom: '$eq.nom', coutTotal: 1, count: 1 } },
        { $sort: { coutTotal: -1 } },
        { $limit: 10 },
      ]),
      OrdreTravail.aggregate([
        { $match: { statut: 'closed', dateCloture: { $gte: debut } } },
        { $group: { _id: null, total: { $sum: '$coutTotal' }, mainOeuvre: { $sum: '$coutMainOeuvre' }, pieces: { $sum: '$coutPieces' } } },
      ]),
    ])

    return success(res, {
      coutParType,
      coutParEquipement,
      coutTotal: coutTotal[0] || { total: 0, mainOeuvre: 0, pieces: 0 },
      periode: `${periode} jours`,
    })
  } catch (err) { next(err) }
}

// GET /api/kpi/disponibilite-7j  – historique disponibilité 7 jours
exports.getDisponibilite7j = async (req, res, next) => {
  try {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const debut = new Date(); debut.setDate(debut.getDate() - i); debut.setHours(0,0,0,0)
      const fin   = new Date(); fin.setDate(fin.getDate() - i);   fin.setHours(23,59,59,999)

      const pannesDuJour = await OrdreTravail.find({
        typeOT: 'corrective', statut: 'closed',
        dateCloture: { $gte: debut, $lte: fin },
      })
      const tempsArretMin = pannesDuJour.reduce((s,o) => s + (o.tempsReel || 0), 0)
      const disponibilite = Math.max(0, 100 - (tempsArretMin / (24*60)) * 100)

      result.push({
        date:           debut.toISOString().split('T')[0],
        label:          i === 0 ? 'Auj.' : `J-${i}`,
        disponibilite:  +disponibilite.toFixed(1),
        tempsArretMin,
        nbPannes:       pannesDuJour.length,
      })
    }
    return success(res, { disponibilite7j: result })
  } catch (err) { next(err) }
}
