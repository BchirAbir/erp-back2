// routes/systemNotification.routes.js
const SystemNotification = require('../../models/SystemNotification');
const { protect }        = require('../../hooks/auth.hook');
const { success, error } = require('../../utils/response');

module.exports = async function systemNotificationRoutes(fastify, opts) {

  // GET /api/notifications/my
  // Returns unread notifications for the current user's role
  fastify.get('/my', { preHandler: [protect] }, async (req, reply) => {
    try {
      const notifications = await SystemNotification.find({
        recipientRole: req.user.role,
        read: false,
      }).sort({ createdAt: -1 }).limit(20);
      return success(reply, notifications);
    } catch (err) { return error(reply, err.message); }
  });

  // GET /api/notifications/pending-managers
  // Returns all accounts with accountStatus: "pending" for Admin bell
  fastify.get('/pending-managers', { preHandler: [protect] }, async (req, reply) => {
    try {
      if (req.user.role !== 'ADMIN') return error(reply, 'Admin only', 403);
      const User = require('../../models/User');
      const pending = await User.find({
        accountStatus: 'pending',
        role: { $nin: ['EMPLOYEE', 'ADMIN'] },
      }).select('name email role department position createdAt').sort({ createdAt: -1 });
      return success(reply, pending);
    } catch (err) { return error(reply, err.message); }
  });

  // PATCH /api/notifications/:id/read
  // Mark a notification as read (dismiss)
  fastify.patch('/:id/read', { preHandler: [protect] }, async (req, reply) => {
    try {
      const notif = await SystemNotification.findOneAndUpdate(
        { _id: req.params.id, recipientRole: req.user.role },
        { read: true },
        { new: true }
      );
      if (!notif) return error(reply, 'Not found', 404);
      return success(reply, notif);
    } catch (err) { return error(reply, err.message); }
  });

  // PATCH /api/notifications/read-all
  // Mark all notifications for this role as read
  fastify.patch('/read-all', { preHandler: [protect] }, async (req, reply) => {
    try {
      await SystemNotification.updateMany(
        { recipientRole: req.user.role, read: false },
        { read: true }
      );
      return success(reply, { message: 'All marked as read' });
    } catch (err) { return error(reply, err.message); }
  });
};
