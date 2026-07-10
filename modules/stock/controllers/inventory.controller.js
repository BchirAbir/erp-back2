const inventoryService = require("../services/inventory.service");
const { success, error } = require("../../../utils/response");

exports.getAllInventories = async (req, reply) => {
  try { return success(reply, await inventoryService.getAllInventories({ userId: req.user?.id, role: req.user?.role })); }
  catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.getInventoryById = async (req, reply) => {
  try { return success(reply, await inventoryService.getInventoryById(req.params.id)); }
  catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.createInventory = async (req, reply) => {
  try {
    return success(reply, await inventoryService.createInventory({
      type:      req.body.type,
      notes:     req.body.notes,
      depotId:   req.body.depotId   || null,
      dateDebut: req.body.dateDebut || null,
      dateFin:   req.body.dateFin   || null,
      year:      req.body.year      || null,
      startedBy: req.user?.id       || null,
    }), 201);
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.getInventoryLines = async (req, reply) => {
  try { return success(reply, await inventoryService.getInventoryLines(req.params.id)); }
  catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.addInventoryLine = async (req, reply) => {
  try {
    return success(reply, await inventoryService.addInventoryLine({
      inventoryCountId: req.params.id,
      productId: req.body.productId,
      lotRef: req.body.lotRef,
      notes: req.body.notes,
      addedBy: req.user?.id || null,
    }), 201);
  } catch (err) {
    const statusCode = err.statusCode ?? (err.name === "ValidationError" ? 400 : null) ?? 500;
    return error(reply, err.message, statusCode);
  }
};

exports.removeInventoryLine = async (req, reply) => {
  try {
    return success(reply, await inventoryService.removeInventoryLine({
      inventoryCountId: req.params.id,
      lineId: req.params.lineId,
    }));
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

exports.sendToDepot = async (req, reply) => {
  try { return success(reply, await inventoryService.sendToDepot(req.params.id)); }
  catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

// Depot Manager: submit physical counted quantities
exports.submitDepotCount = async (req, reply) => {
  try {
    return success(reply, await inventoryService.submitDepotCount({
      inventoryCountId: req.params.id,
      lines: req.body.lines,
      userId: req.user?.id || null,
    }));
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

// Stock Manager: approve entire session
exports.approveInventory = async (req, reply) => {
  try {
    return success(reply, await inventoryService.approveInventory({
      inventoryCountId: req.params.id,
      userId: req.user?.id || null,
    }));
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

// Stock Manager: reject silently — depot manager will write the reason
exports.rejectInventory = async (req, reply) => {
  try {
    return success(reply, await inventoryService.rejectInventory({
      inventoryCountId: req.params.id,
      userId: req.user?.id || null,
    }));
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};

// Depot Manager: respond to a rejection with an explanation (no re-count needed)
exports.submitDepotResponse = async (req, reply) => {
  try {
    return success(reply, await inventoryService.submitDepotResponse({
      inventoryCountId: req.params.id,
      response: req.body.response,
      userId: req.user?.id || null,
    }));
  } catch (err) { return error(reply, err.message, err.statusCode || 500); }
};
