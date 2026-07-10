// hooks/auth.hook.js
// Drop-in replacement for middleware/auth.middleware.js
// Usage in routes: { preHandler: protect }

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, reply) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return reply.code(401).send({ message: "User not found" });
    }

    req.user = user;
  } catch (err) {
    return reply.code(401).send({ message: "Invalid or expired token" });
  }
};

// Role-based guard factory
// Usage: { preHandler: [protect, requireRole("ADMIN")] }
const requireRole = (...roles) => async (req, reply) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return reply.code(403).send({ message: "Forbidden: insufficient role" });
  }
};

module.exports = { protect, requireRole };