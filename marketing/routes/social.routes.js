// routes/social.routes.js
const svc = require("../services/social.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");

const MARKETING = requireRole("MARKETING_MANAGER", "ADMIN");

async function socialRoutes(fastify) {

  // GET /api/social/summary
  // Returns combined Facebook + Instagram analytics
  fastify.get("/summary", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try {
      return success(reply, await svc.getSocialSummary());
    } catch (e) {
      return error(reply, e.message, 502);
    }
  });
}

module.exports = socialRoutes;