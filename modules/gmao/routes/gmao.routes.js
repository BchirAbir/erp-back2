const { expressHandler } = require('./adapter')
const { protect, authorize } = require('./auth.hook')

const auth = require('../controllers/authController')
const users = require('../controllers/userController')
const equipements = require('../controllers/equipementController')
const ots = require('../controllers/otController')
const pieces = require('../controllers/pieceController')
const capteurs = require('../controllers/capteurController')
const alertes = require('../controllers/alerteController')
const kpi = require('../controllers/kpiController')
const planning = require('../controllers/planningController')
const notifications = require('../controllers/notificationController')
const avancee = require('../controllers/gmaoAvanceeController')
const rca = require('../controllers/rcaController')
const weibull = require('../controllers/weibullController')

const h = expressHandler
const managerOrAdmin = [protect, authorize('manager', 'admin')]
const adminOnly = [protect, authorize('admin')]
const allMaintenance = [protect, authorize('manager', 'admin', 'technician')]

async function gmaoRoutes(fastify) {
  fastify.get('/health', async () => ({
    success: true,
    message: 'Module Gestion maintenance integre a l ERP operationnel',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  }))

  fastify.post('/auth/login', h(auth.login))
  fastify.post('/auth/register', h(auth.register))
  fastify.get('/auth/me', { preHandler: [protect] }, h(auth.getMe))
  fastify.put('/auth/change-password', { preHandler: [protect] }, h(auth.changePassword))

  fastify.get('/users/techniciens', { preHandler: [protect] }, h(users.getTechniciens))
  fastify.post('/users/techniciens', { preHandler: managerOrAdmin }, h(users.createTechnicien))
  fastify.get('/users/responsables', { preHandler: adminOnly }, h(users.getResponsables))
  fastify.post('/users/responsables', { preHandler: adminOnly }, h(users.createResponsable))
  fastify.get('/users', { preHandler: managerOrAdmin }, h(users.getAll))
  fastify.get('/users/:id', { preHandler: [protect] }, h(users.getOne))
  fastify.get('/users/:id/planning', { preHandler: [protect] }, h(users.getPlanning))
  fastify.put('/users/:id', { preHandler: managerOrAdmin }, h(users.update))
  fastify.put('/users/:id/disponibilite', { preHandler: [protect] }, h(users.setDisponibilite))
  fastify.delete('/users/:id', { preHandler: managerOrAdmin }, h(users.delete))

  fastify.get('/equipements', { preHandler: [protect] }, h(equipements.getAll))
  fastify.post('/equipements', { preHandler: managerOrAdmin }, h(equipements.create))
  fastify.get('/equipements/:id', { preHandler: [protect] }, h(equipements.getOne))
  fastify.put('/equipements/:id', { preHandler: managerOrAdmin }, h(equipements.update))
  fastify.delete('/equipements/:id', { preHandler: managerOrAdmin }, h(equipements.delete))
  fastify.get('/equipements/:id/historique', { preHandler: [protect] }, h(equipements.getHistorique))
  fastify.get('/equipements/:id/kpi', { preHandler: [protect] }, h(equipements.getKPI))

  fastify.get('/ordres-travail', { preHandler: [protect] }, h(ots.getAll))
  fastify.post('/ordres-travail', { preHandler: [protect] }, h(ots.create))
  fastify.get('/ordres-travail/:id', { preHandler: [protect] }, h(ots.getOne))
  fastify.put('/ordres-travail/:id', { preHandler: managerOrAdmin }, h(ots.update))
  fastify.delete('/ordres-travail/:id', { preHandler: managerOrAdmin }, h(ots.deleteOT))
  fastify.put('/ordres-travail/:id/affecter', { preHandler: managerOrAdmin }, h(ots.affecter))
  fastify.put('/ordres-travail/:id/demarrer', { preHandler: [protect] }, h(ots.demarrer))
  fastify.put('/ordres-travail/:id/cloturer', { preHandler: [protect] }, h(ots.cloturer))
  fastify.put('/ordres-travail/:id/escalader', { preHandler: [protect] }, h(ots.escalader))
  fastify.post('/ordres-travail/:id/pieces', { preHandler: [protect] }, h(ots.consommerPiece))

  fastify.get('/pieces/alertes-stock', { preHandler: [protect] }, h(pieces.alertesStock))
  fastify.get('/pieces', { preHandler: [protect] }, h(pieces.getAll))
  fastify.post('/pieces', { preHandler: managerOrAdmin }, h(pieces.create))
  fastify.get('/pieces/:id', { preHandler: [protect] }, h(pieces.getOne))
  fastify.put('/pieces/:id/consommer', { preHandler: allMaintenance }, h(pieces.consommer))
  fastify.put('/pieces/:id/commander', { preHandler: allMaintenance }, h(pieces.commander))
  fastify.put('/pieces/:id', { preHandler: managerOrAdmin }, h(pieces.update))
  fastify.delete('/pieces/:id', { preHandler: managerOrAdmin }, h(pieces.delete))
  fastify.put('/pieces/:id/reapprovisionner', { preHandler: managerOrAdmin }, h(pieces.reapprovisionner))

  fastify.get('/capteurs/dashboard', { preHandler: [protect] }, h(capteurs.getDashboard))
  fastify.get('/capteurs', { preHandler: [protect] }, h(capteurs.getAll))
  fastify.post('/capteurs', { preHandler: managerOrAdmin }, h(capteurs.create))
  fastify.get('/capteurs/:id', { preHandler: [protect] }, h(capteurs.getOne))
  fastify.put('/capteurs/:id', { preHandler: managerOrAdmin }, h(capteurs.update))
  fastify.post('/capteurs/:id/mesure', { preHandler: [protect] }, h(capteurs.enregistrerMesure))
  fastify.get('/capteurs/:id/historique', { preHandler: [protect] }, h(capteurs.getHistorique))

  fastify.get('/alertes/stats', { preHandler: [protect] }, h(alertes.getStats))
  fastify.get('/alertes', { preHandler: [protect] }, h(alertes.getAll))
  fastify.post('/alertes', { preHandler: managerOrAdmin }, h(alertes.create))
  fastify.get('/alertes/:id', { preHandler: [protect] }, h(alertes.getOne))
  fastify.put('/alertes/:id/traiter', { preHandler: [protect] }, h(alertes.traiter))
  fastify.put('/alertes/:id/ignorer', { preHandler: [protect] }, h(alertes.ignorer))
  fastify.post('/alertes/:id/creer-ot', { preHandler: managerOrAdmin }, h(alertes.creerOT))

  fastify.get('/kpi/dashboard', { preHandler: managerOrAdmin }, h(kpi.getDashboard))
  fastify.get('/kpi/mtbf-mttr', { preHandler: managerOrAdmin }, h(kpi.getMtbfMttr))
  fastify.get('/kpi/compliance', { preHandler: managerOrAdmin }, h(kpi.getCompliance))
  fastify.get('/kpi/repartition-ot', { preHandler: managerOrAdmin }, h(kpi.getRepartitionOT))
  fastify.get('/kpi/pareto-pannes', { preHandler: managerOrAdmin }, h(kpi.getParetoPannes))
  fastify.get('/kpi/couts', { preHandler: managerOrAdmin }, h(kpi.getCouts))
  fastify.get('/kpi/disponibilite-7j', { preHandler: managerOrAdmin }, h(kpi.getDisponibilite7j))

  fastify.get('/planning/semaine', { preHandler: [protect] }, h(planning.getSemaine))
  fastify.get('/planning/preventif', { preHandler: [protect] }, h(planning.getPlansPreventifs))
  fastify.post('/planning/preventif', { preHandler: managerOrAdmin }, h(planning.creerPlan))
  fastify.get('/planning/preventif/:id', { preHandler: [protect] }, h(planning.getPlanById))
  fastify.put('/planning/preventif/:id', { preHandler: managerOrAdmin }, h(planning.updatePlan))
  fastify.delete('/planning/preventif/:id', { preHandler: managerOrAdmin }, h(planning.deletePlan))
  fastify.post('/planning/preventif/:id/generer-ot', { preHandler: managerOrAdmin }, h(planning.genererOT))

  fastify.get('/notifications', { preHandler: [protect] }, h(notifications.getAll))
  fastify.put('/notifications/:id/read', { preHandler: [protect] }, h(notifications.markRead))
  fastify.put('/notifications/:id/delete', { preHandler: [protect] }, h(notifications.remove))
  fastify.delete('/notifications/:id', { preHandler: [protect] }, h(notifications.remove))

  fastify.get('/gmao-avancee', { preHandler: managerOrAdmin }, h(avancee.getDashboard))
  fastify.post('/gmao-avancee/analyses', { preHandler: managerOrAdmin }, h(avancee.createAnalyse))
  fastify.put('/gmao-avancee/analyses/:id', { preHandler: managerOrAdmin }, h(avancee.updateAnalyse))
  fastify.delete('/gmao-avancee/analyses/:id', { preHandler: managerOrAdmin }, h(avancee.deleteAnalyse))
  fastify.post('/gmao-avancee/conformites', { preHandler: managerOrAdmin }, h(avancee.createConformite))
  fastify.delete('/gmao-avancee/conformites/:id', { preHandler: managerOrAdmin }, h(avancee.deleteConformite))

  fastify.get('/rca', { preHandler: [protect] }, h(rca.getAll))
  fastify.post('/rca', { preHandler: [protect] }, h(rca.create))
  fastify.put('/rca/:id', { preHandler: [protect] }, h(rca.update))
  fastify.delete('/rca/:id', { preHandler: [protect] }, h(rca.remove))

  fastify.get('/weibull', { preHandler: [protect] }, h(weibull.getAll))
  fastify.post('/weibull', { preHandler: [protect] }, h(weibull.create))
  fastify.delete('/weibull/:id', { preHandler: [protect] }, h(weibull.remove))
}

module.exports = gmaoRoutes
