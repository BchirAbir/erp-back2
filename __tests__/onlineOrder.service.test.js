process.env.JWT_SECRET = "test-secret";

const mongoose = require("mongoose");
const OnlineOrder   = require("../models/OnlineOrder");
const OnlineProduct = require("../models/OnlineProduct");
const Promotion     = require("../models/Promotion");

// ── Mock heavy cross-module dependencies ──────────────────────────────────────
jest.mock("../modules/commercial/services/sales-order.service", () => ({
createOrder: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011", orderNo: "SO-001" }),  cancelOrder: jest.fn().mockResolvedValue(true),
}));
jest.mock("../modules/stock/services/stock-movement.service", () => ({
  reserveStock:        jest.fn().mockResolvedValue(true),
  deductReservedStock: jest.fn().mockResolvedValue(true),
  releaseReservation:  jest.fn().mockResolvedValue(true),
  createEntry:         jest.fn().mockResolvedValue(true),
}));
jest.mock("../modules/finance/services/finance.service", () => ({}));

const onlineOrderService = require("../online-sales/services/onlineOrder.service");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeProduct(overrides = {}) {
  return OnlineProduct.create({
    stockProductId: new mongoose.Types.ObjectId(),
    name:        overrides.name        ?? "Test Product",
    sku:         overrides.sku         ?? "SKU-001",
    onlinePrice: overrides.onlinePrice ?? 100,
    isListed:    true,
    ...overrides,
  });
}

const sampleCustomer = {
  name:    "Ahmed Ben Ali",
  email:   "ahmed@test.com",
  phone:   "55000001",
  address: "Sfax, Tunisia",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("onlineOrder.service", () => {

  describe("getAll", () => {
    it("should return empty list when no orders exist", async () => {
      const result = await onlineOrderService.getAll();
      expect(result.orders).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should return orders with pagination info", async () => {
      const product = await makeProduct();
      await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const result = await onlineOrderService.getAll({ page: 1, limit: 10 });
      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });

    it("should filter orders by status", async () => {
      const product = await makeProduct({ sku: "SKU-002" });
      await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const pending = await onlineOrderService.getAll({ status: "pending" });
      const completed = await onlineOrderService.getAll({ status: "completed" });
      expect(pending.total).toBe(1);
      expect(completed.total).toBe(0);
    });
  });

  describe("create", () => {
    it("should create an order with correct totalAmount", async () => {
      const product = await makeProduct({ onlinePrice: 50, sku: "SKU-003" });

      const order = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 2, unitPrice: 50 }],
      });

      expect(order._id).toBeDefined();
      expect(order.totalAmount).toBe(100);
      expect(order.status).toBe("pending");
      expect(order.customer.name).toBe("Ahmed Ben Ali");
    });

    it("should apply promotion discount correctly", async () => {
      const product = await makeProduct({ onlinePrice: 200, sku: "SKU-004" });

      // Create an active promotion
      await Promotion.create({
        name:      "Test Promo",
        code:      "SAVE20",
        discount:  20,
        status:    "Active",
        startDate: "2020-01-01",
        endDate:   "2099-12-31",
        type:      "Seasonal",
      });

      const order = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 200 }],
        promotionCode: "SAVE20",
      });

      expect(order.promotionCode).toBe("SAVE20");
      expect(order.promotionDiscount).toBe(20);
      expect(order.totalAmount).toBe(160); // 200 - 20%
    });

    it("should throw 404 if product does not exist", async () => {
      await expect(
        onlineOrderService.create({
          customer: sampleCustomer,
          lines: [{ productId: new mongoose.Types.ObjectId(), quantity: 1, unitPrice: 100 }],
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 for invalid promotion code", async () => {
      const product = await makeProduct({ sku: "SKU-005" });

      await expect(
        onlineOrderService.create({
          customer: sampleCustomer,
          lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
          promotionCode: "INVALID",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("getById", () => {
    it("should return the order by id", async () => {
      const product = await makeProduct({ sku: "SKU-006" });
      const created = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const found = await onlineOrderService.getById(created._id);
      expect(found).not.toBeNull();
      expect(String(found._id)).toBe(String(created._id));
    });

    it("should return null for non-existent id", async () => {
      const result = await onlineOrderService.getById(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("should update status from pending to cancelled", async () => {
      const product = await makeProduct({ sku: "SKU-007" });
      const order = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const updated = await onlineOrderService.updateStatus(order._id, "cancelled");
      expect(updated.status).toBe("cancelled");
    });

    it("should throw 404 for non-existent order", async () => {
      await expect(
        onlineOrderService.updateStatus(new mongoose.Types.ObjectId(), "cancelled")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should not change status if already the same", async () => {
      const product = await makeProduct({ sku: "SKU-008" });
      const order = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const result = await onlineOrderService.updateStatus(order._id, "pending");
      expect(result.status).toBe("pending");
    });
  });

  describe("remove", () => {
    it("should delete an order", async () => {
      const product = await makeProduct({ sku: "SKU-009" });
      const order = await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      await onlineOrderService.remove(order._id);
      const found = await onlineOrderService.getById(order._id);
      expect(found).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return zero stats when no orders exist", async () => {
      const stats = await onlineOrderService.getStats();
      expect(stats.totalOrders).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.byStatus.pending).toBe(0);
    });

    it("should count orders correctly by status", async () => {
      const product = await makeProduct({ sku: "SKU-010" });
      await onlineOrderService.create({
        customer: sampleCustomer,
        lines: [{ productId: product._id, quantity: 1, unitPrice: 100 }],
      });

      const stats = await onlineOrderService.getStats();
      expect(stats.totalOrders).toBe(1);
      expect(stats.byStatus.pending).toBe(1);
    });
  });

  describe("validatePromoCode", () => {
    it("should return promo details for a valid code", async () => {
      await Promotion.create({
        name:      "Flash Sale",
        code:      "FLASH10",
        discount:  10,
        status:    "Active",
        startDate: "2020-01-01",
        endDate:   "2099-12-31",
        type:      "Seasonal",
      });

      const promo = await onlineOrderService.validatePromoCode("FLASH10");
      expect(promo.code).toBe("FLASH10");
      expect(promo.discount).toBe(10);
    });

    it("should throw 404 for an expired code", async () => {
      await Promotion.create({
        name:      "Expired Promo",
        code:      "OLD50",
        discount:  50,
        status:    "Active",
        startDate: "2020-01-01",
        endDate:   "2020-12-31", // expired
        type:      "Seasonal",
      });

      await expect(
        onlineOrderService.validatePromoCode("OLD50")
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});