process.env.JWT_SECRET = "test-secret";

const authService = require("../auth/services/auth.service");

describe("auth.service", () => {
  describe("register", () => {
    it("should create a user and return a token", async () => {
      const result = await authService.register({
        name: "Test User",
        email: "test@test.com",
        password: "123456",
        role: "HR_MANAGER",
        department: "HR",
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("test@test.com");
    });

    it("should throw 409 if email already exists", async () => {
      await authService.register({
        name: "Test User",
        email: "dupe@test.com",
        password: "123456",
        role: "HR_MANAGER",
      });

      await expect(
        authService.register({
          name: "Test User 2",
          email: "dupe@test.com",
          password: "123456",
          role: "HR_MANAGER",
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("login", () => {
    it("should return token with valid credentials", async () => {
      await authService.register({
        name: "Login User",
        email: "login@test.com",
        password: "123456",
        role: "HR_MANAGER",
      });

      const result = await authService.login({
        email: "login@test.com",
        password: "123456",
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("login@test.com");
    });

    it("should throw 401 with wrong password", async () => {
      await authService.register({
        name: "Login User",
        email: "fail@test.com",
        password: "123456",
        role: "HR_MANAGER",
      });

      await expect(
        authService.login({
          email: "fail@test.com",
          password: "wrongpass",
        })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});