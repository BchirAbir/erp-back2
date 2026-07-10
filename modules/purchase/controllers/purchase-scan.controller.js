const scanService = require("../services/purchase-scan.service");

exports.scanInvoice = async (req, reply) => {
  try {
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ message: "Aucun fichier fourni" });
    }

    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = require("path").extname(file.filename || "").toLowerCase();
    if (!allowed.includes(ext)) {
      return reply.code(400).send({ message: "Format non supporté. Utilisez PDF, JPG ou PNG." });
    }

    const result = await scanService.uploadAndExtract(file);
    return reply.code(200).send(result);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
