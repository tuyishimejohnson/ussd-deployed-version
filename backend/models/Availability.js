// models/Availability.js
const mongoose = require("mongoose");

const AvailabilitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  availableFrom: { type: String, required: true },
  availableTo: { type: String, required: true },
  day: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Availability", AvailabilitySchema);
