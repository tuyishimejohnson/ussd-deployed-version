const mongoose = require("mongoose");

const MaternalSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  age: { type: String, required: true },
  gender: { type: String, required: true },
  address: { type: String },
  contactNumber: { type: String },
  recordedBy: {
    type: String,
  },
  notes: { type: String },
  pregnancyStatus: {
    type: String,
    enum: ["pregnant", "postpartum"],
    required: true,
  },
  gestationWeeks: { type: Number, required: true },
  gravida: { type: Number, required: true },
  para: { type: Number, required: true },
  antenatalVisits: { type: Number, required: true },
  riskFactors: [{ type: String }],
  complications: [{ type: String }],
  vitals: {
    bloodPressure: { type: String, required: true },
    weight: { type: Number, required: true },
    hemoglobin: { type: Number, required: true },
  },
  nextVisitDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MaternalRecord", MaternalSchema);
