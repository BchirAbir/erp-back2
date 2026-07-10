const svc = require("../services/campaign.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");
const { createCampaignBody, updateCampaignBody, idParam } = require("../schemas/campaign.schema");

const MARKETING = requireRole("MARKETING_MANAGER", "ADMIN");

async function campaignRoutes(fastify) {

  // GET /api/campaigns?month=YYYY-MM&status=Active&channel=Email
  fastify.get("/", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getAll(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // GET /api/campaigns/stats?month=YYYY-MM
  fastify.get("/stats", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getStats(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // GET /api/campaigns/analytics?month=YYYY-MM
  fastify.get("/analytics", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getAnalytics(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // POST /api/campaigns
  fastify.post("/", { preHandler: [protect, MARKETING], schema: { body: createCampaignBody } }, async (req, reply) => {
    try {
      const campaign = await svc.create({ ...req.body, createdBy: req.user._id });
      return success(reply, campaign, 201);
    } catch (e) { return error(reply, e.message); }
  });

  // PUT /api/campaigns/:id
  fastify.put("/:id", { preHandler: [protect, MARKETING], schema: { body: updateCampaignBody, params: idParam } }, async (req, reply) => {
    try {
      const campaign = await svc.update(req.params.id, req.body);
      if (!campaign) return error(reply, "Campaign not found", 404);
      return success(reply, campaign);
    } catch (e) { return error(reply, e.message); }
  });

  // DELETE /api/campaigns/:id
  fastify.delete("/:id", { preHandler: [protect, MARKETING], schema: { params: idParam } }, async (req, reply) => {
    try {
      await svc.remove(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message); }
  });
}

module.exports = campaignRoutes;