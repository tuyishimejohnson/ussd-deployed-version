// models/Availability.js
const mongoose = require("mongoose");

const AvailabilitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to User
  availableFrom: { type: String, required: true }, // e.g., "08:00"
  availableTo: { type: String, required: true }, // e.g., "16:00"
  day: { type: String, required: true }, // optional, like "Monday"
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Availability", AvailabilitySchema);
