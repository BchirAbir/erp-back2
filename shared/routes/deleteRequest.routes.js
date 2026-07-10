// shared/routes/deleteRequest.routes.js
const svc = require("../services/deleteRequest.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error } = require("../../utils/response");

// All manager roles that can upload/delete documents
const MANAGER = requireRole(
  "HR_MANAGER",
  "MARKETING_MANAGER",
  "SALES_MANAGER",
  "COMMERCIAL_MANAGER",
  "FINANCE_MANAGER",
  "PURCHASE_MANAGER",
  "STOCK_MANAGER"
);
const ADMIN = requireRole("ADMIN");

async function deleteRequestRoutes(fastify) {

  // GET /api/delete-requests/my-approved
  // Polled by the Navbar for every authenticated user; returns only the
  // caller's own approved requests, so any logged-in role may read it.
  fastify.get("/my-approved", { preHandler: [protect] }, async (req, reply) => {
    try {
      const requests = await svc.getApprovedForUser(req.user._id);
      return success(reply, requests);
    } catch (e) { return error(reply, e.message); }
  });

  // POST /api/delete-requests  { documentId }
  fastify.post("/", { preHandler: [protect, MANAGER] }, async (req, reply) => {
    try {
      const { documentId } = req.body;
      if (!documentId) return error(reply, "documentId is required", 400);
      const result = await svc.createRequest(documentId, req.user.name, req.user._id);
      return success(reply, result, 201);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // GET /api/delete-requests/document/:documentId
  fastify.get("/document/:documentId", { preHandler: [protect, MANAGER] }, async (req, reply) => {
    try {
      const req2 = await svc.getRequestForDocument(req.params.documentId, req.user._id);
      return success(reply, req2 || null);
    } catch (e) { return error(reply, e.message); }
  });

  // POST /api/delete-requests/verify  { documentId, code }
  fastify.post("/verify", { preHandler: [protect, MANAGER] }, async (req, reply) => {
    try {
      const { documentId, code } = req.body;
      if (!documentId || !code) return error(reply, "documentId and code are required", 400);
      const result = await svc.verifyAndDelete(documentId, code, req.user._id);
      return success(reply, result);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // PATCH /api/delete-requests/:id/seen
  fastify.patch("/:id/seen", { preHandler: [protect, MANAGER] }, async (req, reply) => {
    try {
      const result = await svc.markSeen(req.params.id, req.user._id);
      return success(reply, result);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // ADMIN: get all pending
  fastify.get("/pending", { preHandler: [protect, ADMIN] }, async (req, reply) => {
    try {
      return success(reply, await svc.getPending());
    } catch (e) { return error(reply, e.message); }
  });

  // ADMIN: get pending count
  fastify.get("/pending/count", { preHandler: [protect, ADMIN] }, async (req, reply) => {
    try {
      const count = await svc.getPendingCount();
      return success(reply, { count });
    } catch (e) { return error(reply, e.message); }
  });

  // ADMIN: get all requests
  fastify.get("/", { preHandler: [protect, ADMIN] }, async (req, reply) => {
    try {
      return success(reply, await svc.getAll());
    } catch (e) { return error(reply, e.message); }
  });

  // ADMIN: approve
  fastify.patch("/:id/approve", { preHandler: [protect, ADMIN] }, async (req, reply) => {
    try {
      const result = await svc.approve(req.params.id, req.user.name);
      return success(reply, result);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });

  // ADMIN: reject
  fastify.patch("/:id/reject", { preHandler: [protect, ADMIN] }, async (req, reply) => {
    try {
      const result = await svc.reject(req.params.id, req.user.name);
      return success(reply, result);
    } catch (e) { return error(reply, e.message, e.statusCode || 500); }
  });
}

module.exports = deleteRequestRoutes;