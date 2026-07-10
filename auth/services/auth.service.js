// services/auth.service.js

const jwt = require("jsonwebtoken");
const User = require("../../models/User");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.register = async ({ name, email, password, role, department }) => {
  const exists = await User.findOne({ email });
  if (exists) throw Object.assign(new Error("Email already in use"), { statusCode: 409 });

  const user = await User.create({ name, email, password, role, department });
  return { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: generateToken(user._id) };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }
  return { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: generateToken(user._id) };
};

exports.getMe = async (id) => {
  return User.findById(id).select("-password");
};
