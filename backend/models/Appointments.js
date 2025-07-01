const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema({
  patientPhoneNumber: String,
  patientName: String,
  chwId: String,
  userName: String,
  district: String,
  sector: String,
  cell: String,
  village: String,
  appointmentDate: { type: Date, default: Date.now },
  status: { type: String, default: "booked" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Appointment", AppointmentSchema);
