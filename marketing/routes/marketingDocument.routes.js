const svc    = require("../services/marketingDocument.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");

const ALLOWED = requireRole("MARKETING_MANAGER", "ADMIN");

async function marketingDocumentRoutes(fastify) {

  // POST /api/marketing/documents
  fastify.post("/documents", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const parts    = req.parts();
      const fields   = {};
      let fileBuffer = null;
      let fileName   = "";
      let mimeType   = "application/pdf";

      for await (const part of parts) {
        if (part.file) {
          const chunks = [];
          for await (const chunk of part.file) chunks.push(chunk);
          fileBuffer = Buffer.concat(chunks);
          fileName   = part.filename;
          mimeType   = part.mimetype;
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      if (!fields.type || !fileName || !fileBuffer)
        return error(reply, "type and file are required", 400);
      if (mimeType !== "application/pdf")
        return error(reply, "Only PDF files are accepted", 400);
      if (fileBuffer.length > 10 * 1024 * 1024)
        return error(reply, "File must be under 10MB", 400);

      const doc = await svc.upload({
        linkedEmployeeId:   fields.linkedEmployeeId   || null,
        linkedEmployeeName: fields.linkedEmployeeName || "",
        type:      fields.type,
        fileName,
        mimeType,
        fileSize:  fileBuffer.length,
        note:      fields.note || "",
        uploadedBy: req.user.name,
      }, fileBuffer);

      return success(reply, {
        _id: doc._id, fileName: doc.fileName, type: doc.type,
        filePath: doc.filePath, createdAt: doc.createdAt,
      }, 201);
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // GET /api/marketing/documents
  fastify.get("/documents", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const docs = await svc.list(req.query);
      return success(reply, docs);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });

  // GET /api/marketing/documents/:id/download
  fastify.get("/documents/:id/download", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const { stream, doc } = await svc.stream(req.params.id);
      reply.header("Content-Type", doc.mimeType || "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      return reply.send(stream);
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // DELETE /api/marketing/documents/:id
  fastify.delete("/documents/:id", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      await svc.delete(req.params.id);
      return success(reply, { deleted: true });
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });
}

module.exports = marketingDocumentRoutes;