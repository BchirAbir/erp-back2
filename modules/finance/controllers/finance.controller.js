const financeService = require("../services/finance.service");

exports.getDashboard = async (req, reply) => {
  try {
    const year = req.query?.year ? Number(req.query.year) : undefined;
    return reply.code(200).send(await financeService.getDashboard(year));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getReceivables = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getReceivables());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getPayables = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getPayables());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getTreasury = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getTreasury());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getEntries = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getEntries());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getJournal = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getJournal());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getAccounts = async (req, reply) => {
  try {
    const { year, month } = req.query || {};
    return reply.code(200).send(await financeService.getAccounts({ year, month }));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getAccountLedger = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getAccountLedger(req.params.code));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getReports = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getReports());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateInvoiceTej = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.updateInvoiceTej(req.params.id, req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.createManualEntry = async (req, reply) => {
  try {
    return reply.code(201).send(await financeService.createManualEntry(req.body, req.user?._id));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getManualEntries = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getManualEntries());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.deleteManualEntry = async (req, reply) => {
  try {
    await financeService.deleteManualEntry(req.params.id);
    return reply.code(204).send();
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getTvaDeclaration = async (req, reply) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    return reply.code(200).send(await financeService.getTvaDeclaration(year, month));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getRsPayments = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getRsPayments());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getCalendar = async (req, reply) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    return reply.code(200).send(await financeService.getCalendar(year, month));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getSettings = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getCompanySettings());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.updateSettings = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.updateCompanySettings(req.body));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getDepartmentExpenses = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.getDepartmentExpenses());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.getSalesReport = async (req, reply) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return reply.code(400).send({ message: "Les paramètres 'from' et 'to' sont requis" });
    }
    return reply.code(200).send(await financeService.getSalesReport(from, to));
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.payPayable = async (req, reply) => {
  try {
    const result = await financeService.payPayable(req.params.id, {
      ...req.body,
      createdBy: req.user?._id,
    });
    return reply.code(200).send(result);
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};

exports.resyncFinanceEntries = async (req, reply) => {
  try {
    return reply.code(200).send(await financeService.resyncFinanceEntries());
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message });
  }
};
