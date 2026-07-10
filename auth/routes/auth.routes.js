// routes/auth.routes.js

const { protect } = require("../../hooks/auth.hook");
const { register, login, getMe } = require("../controllers/auth.controller");
const { registerBody, loginBody } = require("../schemas/auth.schema");

async function authRoutes(fastify, options) {
  fastify.post("/register", { schema: { body: registerBody } }, register);

  // Stricter rate limit on login: max 5 attempts per minute per IP
  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
        errorResponseBuilder: () => ({
          message: "Too many login attempts. Please wait 1 minute before trying again.",
        }),
      },
    },
    schema: { body: loginBody },
  }, login);

  fastify.get("/me", { preHandler: [protect] }, getMe);
}

module.exports = authRoutes;