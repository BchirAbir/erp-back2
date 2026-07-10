const svc = require("../services/promotion.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");
const { createPromotionBody, updatePromotionBody, idParam } = require("../schemas/promotion.schema");

const MARKETING = requireRole("MARKETING_MANAGER", "ADMIN");

async function promotionRoutes(fastify) {

  // GET /api/promotions?month=YYYY-MM&status=Active
  fastify.get("/", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getAll(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // GET /api/promotions/stats?month=YYYY-MM
  fastify.get("/stats", { preHandler: [protect, MARKETING] }, async (req, reply) => {
    try { return success(reply, await svc.getStats(req.query)); }
    catch (e) { return error(reply, e.message); }
  });

  // POST /api/promotions
  fastify.post("/", { preHandler: [protect, MARKETING], schema: { body: createPromotionBody } }, async (req, reply) => {
    try {
      const promo = await svc.create({ ...req.body, createdBy: req.user._id });
      return success(reply, promo, 201);
    } catch (e) { return error(reply, e.message); }
  });

  // PUT /api/promotions/:id
  fastify.put("/:id", { preHandler: [protect, MARKETING], schema: { body: updatePromotionBody, params: idParam } }, async (req, reply) => {
    try {
      const promo = await svc.update(req.params.id, req.body);
      if (!promo) return error(reply, "Promotion not found", 404);
      return success(reply, promo);
    } catch (e) { return error(reply, e.message); }
  });

  // DELETE /api/promotions/:id
  fastify.delete("/:id", { preHandler: [protect, MARKETING], schema: { params: idParam } }, async (req, reply) => {
    try {
      await svc.remove(req.params.id);
      return success(reply, { deleted: true });
    } catch (e) { return error(reply, e.message); }
  });
}

module.exports = promotionRoutes;