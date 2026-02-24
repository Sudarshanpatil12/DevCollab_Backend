const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT_SECRET is not set");
    err.code = "MISSING_JWT_SECRET";
    throw err;
  }
  return jwt.sign({ id, role }, secret, {
    expiresIn: "7d",
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = ["Admin", "Developer", "Viewer"];
    const userRole = allowedRoles.includes(role) ? role : "Developer";

    const emailNorm = (email || "").trim().toLowerCase();
    const nameNorm = (name || "").trim();
    const passwordVal = password || "";

    if (!emailNorm) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!nameNorm) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (passwordVal.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name: nameNorm,
      email: emailNorm,
      password: passwordVal,
      role: userRole,
    });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in .env");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error("Register error:", error);
    const message =
      error.name === "ValidationError"
        ? Object.values(error.errors || {})
            .map((e) => e.message)
            .join(", ") || error.message
        : error.message;
    return res.status(500).json({ message: "Server error", error: message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNorm = (email || "").trim().toLowerCase();
    const passwordVal = password || "";

    if (!emailNorm || !passwordVal) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(passwordVal);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error("Login error:", error);
    const message =
      error.name === "ValidationError"
        ? Object.values(error.errors || {})
            .map((e) => e.message)
            .join(", ") || error.message
        : error.message;
    return res.status(500).json({ message: "Server error", error: message });
  }
};

exports.getProfile = async (req, res) => {
  return res.json(req.user);
};
