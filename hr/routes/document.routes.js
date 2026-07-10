const documentService = require("../services/document.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");
const path = require("path");

const ALLOWED = requireRole("HR_MANAGER", "ADMIN");

async function documentRoutes(fastify) {

  // ── Upload document  POST /api/documents ────────────────────────────────────
  // Accepts multipart/form-data with fields: employeeId, employeeName,
  // department, type, note  +  file field: "file"
  fastify.post("/", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const parts = req.parts();
      const fields = {};
      let fileBuffer = null;
      let fileName   = "";
      let mimeType   = "application/pdf";
      let fileSize   = 0;

      for await (const part of parts) {
        if (part.file) {
          // It's the file
          const chunks = [];
          for await (const chunk of part.file) chunks.push(chunk);
          fileBuffer = Buffer.concat(chunks);
          fileName   = part.filename;
          mimeType   = part.mimetype;
          fileSize   = fileBuffer.length;
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      if (!fields.type || !fileName || !fileBuffer)
        return error(reply, "type and file are required", 400);

      if (mimeType !== "application/pdf")
        return error(reply, "Only PDF files are accepted", 400);

      if (fileSize > 10 * 1024 * 1024)
        return error(reply, "File must be under 10MB", 400);

      const doc = await documentService.uploadDocument({
        employeeId:   fields.employeeId,
        employeeName: fields.employeeName || "",
        department:   fields.department   || "HR",
        type:         fields.type,
        fileName,
        mimeType,
        fileSize,
        note:         fields.note || "",
        uploadedBy:   req.user.name,
      }, fileBuffer);

      return success(reply, {
        _id: doc._id, fileName: doc.fileName, type: doc.type,
        filePath: doc.filePath, createdAt: doc.createdAt,
      }, 201);
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // ── List documents  GET /api/documents ─────────────────────────────────────
  fastify.get("/", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const docs = await documentService.getDocuments(req.query);
      return success(reply, docs);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });

  // ── Stream / download  GET /api/documents/:id/download ─────────────────────
  fastify.get("/:id/download", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const { stream, doc } = await documentService.streamDocument(req.params.id, reply);
      reply.header("Content-Type", doc.mimeType || "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      return reply.send(stream);
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // ── Delete document  DELETE /api/documents/:id ──────────────────────────────
  fastify.delete("/:id", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      await documentService.deleteDocument(req.params.id);
      return success(reply, { message: "Deleted" });
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });
}

module.exports = documentRoutes;