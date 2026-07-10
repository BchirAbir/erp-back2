const fp = require("fastify-plugin");
const mongoose = require("mongoose");

async function mongoPlugin(fastify, options) {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    fastify.log.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    fastify.addHook("onClose", async () => {
      await mongoose.connection.close();
      fastify.log.info("MongoDB connection closed");
    });
  } catch (error) {
    fastify.log.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = fp(mongoPlugin);