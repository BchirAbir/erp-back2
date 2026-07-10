// online-sales/routes/onlineDocument.routes.js
const svc = require("../services/onlineDocument.service");
const { protect, requireRole } = require("../../hooks/auth.hook");
const { success, error }       = require("../../utils/response");

const ALLOWED = requireRole("SALES_MANAGER", "ADMIN");

const VALID_TYPES = [
  "Sales Report",
  "Customer Invoice",
  "Reseller Contract",
  "Refund Notice (RMA)",
  "Shipment Manifest",
  "Promotion Brief",
  "Other",
];

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 24, maxLength: 24 },
  },
};

async function onlineDocumentRoutes(fastify) {

  // POST /api/online-sales/documents
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
      if (!VALID_TYPES.includes(fields.type))
        return error(reply, `type must be one of: ${VALID_TYPES.join(", ")}`, 400);
      if (mimeType !== "application/pdf")
        return error(reply, "Only PDF files are accepted", 400);
      if (fileBuffer.length > 10 * 1024 * 1024)
        return error(reply, "File must be under 10MB", 400);

      const doc = await svc.upload(
        {
          type:       fields.type,
          fileName,
          mimeType,
          fileSize:   fileBuffer.length,
          note:       fields.note || "",
          uploadedBy: req.user.name || req.user.email || "",
        },
        fileBuffer
      );

      return success(
        reply,
        {
          _id:       doc._id,
          type:      doc.type,
          fileName:  doc.fileName,
          fileSize:  doc.fileSize,
          note:      doc.note,
          uploadedBy: doc.uploadedBy,
          createdAt: doc.createdAt,
        },
        201
      );
    } catch (err) {
      return error(reply, err.message, err.statusCode || 500);
    }
  });

  // GET /api/online-sales/documents?type=Sales Report
  fastify.get("/documents", { preHandler: [protect, ALLOWED] }, async (req, reply) => {
    try {
      const docs = await svc.list(req.query);
      return success(reply, docs);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });

  // GET /api/online-sales/documents/:id/download
  fastify.get(
    "/documents/:id/download",
    { preHandler: [protect, ALLOWED], schema: { params: idParam } },
    async (req, reply) => {
      try {
        const { stream, doc } = await svc.stream(req.params.id);
        reply.header("Content-Type", doc.mimeType || "application/pdf");
        reply.header(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(doc.fileName)}"`
        );
        return reply.send(stream);
      } catch (err) {
        return error(reply, err.message, err.statusCode || 500);
      }
    }
  );

  // DELETE /api/online-sales/documents/:id
  fastify.delete(
    "/documents/:id",
    { preHandler: [protect, ALLOWED], schema: { params: idParam } },
    async (req, reply) => {
      try {
        await svc.delete(req.params.id);
        return success(reply, { deleted: true });
      } catch (err) {
        return error(reply, err.message, 500);
      }
    }
  );
}

module.exports = onlineDocumentRoutes;
