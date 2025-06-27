const mongoose = require("mongoose");

// const CHWSchema = new mongoose.Schema({
//   name: String,
//   nameRw: String,
//   phoneNumber: String,
//   district: String,
//   sector: String,
//   cell: String,
//   village: String,
//   specializations: [String],
//   specializationsRw: [String],
//   availableHours: {
//     start: Number, // 24-hour format
//     end: Number,
//   },
//   isActive: { type: Boolean, default: true },
//   experience: String,
//   experienceRw: String,
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("CHW", CHWSchema);

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
  weeklyAvailability: {
    monday: {
      isAvailable: Boolean,
      startTime: String, // "08:00"
      endTime: String, // "17:00"
    },
    tuesday: { isAvailable: Boolean, startTime: String, endTime: String },
    wednesday: { isAvailable: Boolean, startTime: String, endTime: String },
    thursday: { isAvailable: Boolean, startTime: String, endTime: String },
    friday: { isAvailable: Boolean, startTime: String, endTime: String },
    saturday: { isAvailable: Boolean, startTime: String, endTime: String },
    sunday: { isAvailable: Boolean, startTime: String, endTime: String },
  },
  isActive: { type: Boolean, default: true },
  experience: String,
  experienceRw: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
