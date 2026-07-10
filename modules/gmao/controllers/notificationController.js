const Notification = require('../models/Notification');
const { success, error } = require('../utils/apiResponse');

/**
 * GET /api/notifications
 * Récupère les 30 dernières notifications ciblées selon le rôle et l'utilisateur
 */
exports.getAll = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    const filter = {};

    // Gestion dynamique et sécurisée des filtres de visibilité
    if (role !== 'admin') {
      // Un utilisateur classique ne voit que ce qui est destiné à son rôle
      filter.cibleRole = role;
      
      // Si c'est un technicien, on affine pour ne lui montrer que ses propres alertes
      if (role === 'technician') {
        filter.technicien = _id;
      }
    } else {
      // Pour l'admin : il peut soit tout voir, soit voir les alertes destinées aux admins
      // Option choisie ici : l'admin voit tout. Si tu veux restreindre, décommente la ligne dessous :
     filter.cibleRole = 'admin';
    }

    // Exécution parallèle de la récupération et du calcul des non-lus globaux
    const [notifications, totalUnread] = await Promise.all([
      Notification.find(filter)
        .populate('creePar', 'nom prenom email role')
        .populate('technicien', 'nom prenom email adresse telephone')
        .sort({ lu: 1, createdAt: -1 })
        .limit(30)
        .lean(), // .lean() améliore grandement les performances en retournant du JSON pur au lieu d'objets Mongoose lourds
      
      Notification.countDocuments({ ...filter, lu: false })
    ]);

    return success(res, {
      notifications,
      count: notifications.length,
      unread: totalUnread, // Valeur réelle exacte calculée en base de données
    });
  } catch (err) { 
    next(err); 
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marque une notification comme lue après vérification stricte des droits d'accès
 */
exports.markRead = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return error(res, 'Notification introuvable', 404);
    }

    // Contrôle d'accès : L'admin passe toujours, les autres rôles doivent correspondre à la cible
    if (role !== 'admin') {
      if (notification.cibleRole !== role) {
        return error(res, 'Notification non autorisée', 403);
      }
      
      // Si c'est un technicien, il ne peut modifier que ce qui lui est personnellement attribué
      if (role === 'technician' && notification.technicien?.toString() !== _id.toString()) {
        return error(res, 'Notification non autorisée', 403);
      }
    }

    // Mise à jour de l'état de lecture
    notification.lu = true;
    await notification.save();

    return success(res, { notification }, 'Notification marquée comme lue');
  } catch (err) { 
    next(err); 
  }
};
exports.remove = async (req, res, next) => {
  try {
    const { role, _id } = req.user;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return error(res, 'Notification introuvable', 404);
    }

    if (role !== 'admin') {
      if (notification.cibleRole !== role) {
        return error(res, 'Notification non autorisee', 403);
      }

      if (role === 'technician' && notification.technicien?.toString() !== _id.toString()) {
        return error(res, 'Notification non autorisee', 403);
      }
    }

    await notification.deleteOne();
    return success(res, { deleted: true }, 'Notification supprimee');
  } catch (err) {
    next(err);
  }
};