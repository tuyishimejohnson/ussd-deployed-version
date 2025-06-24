const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Signup
router.post("/signup", async (req, res) => {
  console.log(req.body);
  const { name, phone, district, sector, cell, village, password } = req.body;
  const existingUser = await User.findOne({
    name,
    phone,
    district,
    sector,
    cell,
    village,
  });
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    phone,
    district,
    sector,
    cell,
    village,
    password: hashedPassword,
  });
  console.log(user);
  await user.save();

  res.status(201).json({ message: "User created" });
});

// Login
router.post("/login", async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findOne({ name });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Verify token (optional route)
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
