const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Signup
router.post("/signup", async (req, res) => {
  console.log(req.body);
  const {
    name,
    phone,
    district,
    sector,
    cell,
    village,
    specialization,
    password,
  } = req.body;
  const existingUser = await User.findOne({
    name,
    phone,
    district,
    sector,
    cell,
    village,
    specialization,
  });
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a random 4-digit PIN as a string
  function generatePin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  let pin;
  let pinExists = true;
  // Ensure the generated PIN is unique
  while (pinExists) {
    pin = generatePin();
    pinExists = await User.findOne({ pin });
  }

  const user = new User({
    name,
    phone,
    district,
    sector,
    cell,
    village,
    specialization,
    password: hashedPassword,
    pin,
  });
  console.log(user);
  await user.save();

  res.status(201).json({ message: "User created", pin });
});

// Login
router.post("/login", async (req, res) => {
  const { name, pin } = req.body;
  const user = await User.findOne({ name, pin });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

  res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      district: user.district,
      sector: user.sector,
      cell: user.cell,
      village: user.village,
      specialization: user.specialization,
      pin:user.pin
    },
  });
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
