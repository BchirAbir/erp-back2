const svc = require("../services/purchase-product-category.service");

module.exports = {
  async getAll(req, reply) {
    reply.send(await svc.getAll());
  },

  async create(req, reply) {
    const { productId, categoryId } = req.body;
    const doc = await svc.create({ productId, categoryId, createdBy: req.user?._id || null });
    reply.status(201).send(doc);
  },

  async update(req, reply) {
    const doc = await svc.update(req.params.id, req.body);
    reply.send(doc);
  },

  async remove(req, reply) {
    await svc.remove(req.params.id);
    reply.send({ message: "Supprimé" });
  },
};
