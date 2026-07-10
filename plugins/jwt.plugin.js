const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

async function jwtPlugin(fastify, options) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  // Decorate fastify with a reusable authenticate helper
  fastify.decorate("authenticate", async function (req, reply) {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
}

module.exports = fp(jwtPlugin);