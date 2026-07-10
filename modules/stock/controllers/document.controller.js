const documentService = require("../services/document.service");

const documentController = {
  async getAll(req, reply) {
    const docs = await documentService.getAll();
    reply.send(docs);
  },

  async download(req, reply) {
    const doc = await documentService.getById(req.params.id);
    if (!doc) return reply.status(404).send({ message: "Document introuvable" });
    reply
      .header("Content-Type", doc.mimeType)
      .header("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`)
      .header("Content-Length", doc.size)
      .send(doc.data);
  },

  async upload(req, reply) {
    const { originalName, mimeType, size, data, description } = req.body;
    if (!originalName || !mimeType || !size || !data) {
      return reply.status(400).send({ message: "Champs requis manquants" });
    }
    const doc = await documentService.create({
      originalName, mimeType, size, data, description,
      uploadedBy: req.user._id,
    });
    reply.status(201).send({ _id: doc._id, originalName: doc.originalName, mimeType: doc.mimeType, size: doc.size, description: doc.description, createdAt: doc.createdAt });
  },

  async generateOtp(req, reply) {
    const result = await documentService.generateOtp();
    reply.send(result);
  },

  async remove(req, reply) {
    const { otp } = req.body ?? {};
    if (!otp) return reply.status(400).send({ message: "Code OTP requis" });
    const check = await documentService.validateOtp(otp);
    if (!check.valid) return reply.status(403).send({ message: check.reason });
    const doc = await documentService.delete(req.params.id);
    if (!doc) return reply.status(404).send({ message: "Document introuvable" });
    reply.send({ message: "Supprimé" });
  },

  async stats(req, reply) {
    const data = await documentService.getStats();
    reply.send(data);
  },
};

module.exports = documentController;
