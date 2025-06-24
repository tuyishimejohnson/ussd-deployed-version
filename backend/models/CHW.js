const mongoose = require("mongoose");

const CHWSchema = new mongoose.Schema({
  name: String,
  nameRw: String,
  phoneNumber: String,
  district: String,
  sector: String,
  cell: String,
  village: String,
  specializations: [String],
  specializationsRw: [String],
  availableHours: {
    start: Number, // 24-hour format
    end: Number,
  },
  isActive: { type: Boolean, default: true },
  experience: String,
  experienceRw: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CHW", CHWSchema);
