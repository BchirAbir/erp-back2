const PurchasePayment = require("../models/purchase-payment.model");
const PurchaseInvoice = require("../models/purchase-invoice.model");
const Supplier = require("../models/supplier.model");
const financeService = require("../../finance/services/finance.service");
const Notification = require("../../../models/Notification");

async function generatePaymentNo() {
  const count = await PurchasePayment.countDocuments();
  return `REG-${String(count + 1).padStart(4, "0")}`;
}

const populatePayment = (query) =>
  query
    .populate("supplierId", "supplierNo name")
    .populate("purchaseInvoiceId", "invoiceNo totalTtc amountPaid dueDate status")
    .populate("createdBy", "name email role");

exports.getAllPurchasePayments = async () =>
  populatePayment(PurchasePayment.find()).sort({ paymentDate: -1, createdAt: -1 });

exports.createPurchasePayment = async ({
  supplierId,
  purchaseInvoiceId,
  method,
  amount,
  paymentDate,
  notes = "",
  createdBy = null,
}) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw Object.assign(new Error("Supplier not found"), { statusCode: 404 });
  }

  const invoice = await PurchaseInvoice.findById(purchaseInvoiceId);
  if (!invoice) {
    throw Object.assign(new Error("Purchase invoice not found"), { statusCode: 404 });
  }

  if (invoice.supplierId.toString() !== supplierId) {
    throw Object.assign(new Error("Supplier does not match the invoice"), {
      statusCode: 400,
    });
  }

  if (!["APPROVED", "PARTIALLY_PAID"].includes(invoice.status)) {
    throw Object.assign(new Error("Only approved invoices can receive payments"), {
      statusCode: 400,
    });
  }

  const remaining = invoice.totalTtc - (invoice.amountPaid || 0);
  if (amount <= 0 || amount > remaining) {
    throw Object.assign(
      new Error(`Payment amount must be between 0 and ${remaining.toFixed(3)}`),
      { statusCode: 400 }
    );
  }

  const payment = await PurchasePayment.create({
    paymentNo: await generatePaymentNo(),
    supplierId,
    purchaseInvoiceId,
    method,
    amount,
    paymentDate,
    notes,
    createdBy,
  });

  invoice.amountPaid = (invoice.amountPaid || 0) + amount;
  invoice.status = invoice.amountPaid >= invoice.totalTtc ? "PAID" : "PARTIALLY_PAID";
  await invoice.save();
  await financeService.recordPurchasePayment({ payment, invoice });

  Notification.create({
    module: "FINANCE",
    eventType: "PAYMENT_MADE",
    title: `Paiement fournisseur — ${supplier.name}`,
    message: `Paiement de ${amount.toFixed(3)} TND effectué sur la facture ${invoice.invoiceNo}. Statut: ${invoice.status === "PAID" ? "Soldée" : "Partiellement payée"}.`,
    metadata: { supplierName: supplier.name, invoiceNo: invoice.invoiceNo, amount, method },
    createdBy,
  }).catch(() => {});

  return populatePayment(PurchasePayment.findById(payment._id));
};

exports.getPaymentSummary = async () => {
  const invoices = await PurchaseInvoice.find();
  const payments = await PurchasePayment.find();

  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalTtc - (invoice.amountPaid || 0)),
    0
  );
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const overdueCount = invoices.filter(
    (invoice) =>
      ["APPROVED", "PARTIALLY_PAID"].includes(invoice.status) &&
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date()
  ).length;

  const supplierBalances = new Map();
  for (const invoice of invoices) {
    const key = invoice.supplierId.toString();
    const current = supplierBalances.get(key) || 0;
    supplierBalances.set(key, current + Math.max(0, invoice.totalTtc - (invoice.amountPaid || 0)));
  }

  return {
    totalOutstanding,
    totalPaid,
    overdueCount,
    supplierBalances: Array.from(supplierBalances.entries()).map(([supplierId, balance]) => ({
      supplierId,
      balance,
    })),
  };
};
