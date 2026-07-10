// hr/routes/companyConfig.routes.js
const companyConfigService = require("../services/companyConfig.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");

async function companyConfigRoutes(fastify) {
  // GET /api/company-config — any authenticated user (the payslip generator reads it)
  fastify.get("/", { preHandler: [protect] }, async (req, reply) => {
    try {
      return success(reply, await companyConfigService.get());
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // PUT /api/company-config — Admin or HR Manager only
  fastify.put("/", { preHandler: [protect, requireRole("ADMIN", "HR_MANAGER")] }, async (req, reply) => {
    try {
      return success(reply, await companyConfigService.update(req.body));
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });
}

module.exports = companyConfigRoutes;
