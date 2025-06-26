const mongoose = require("mongoose");

const MaternalSchema = new mongoose.Schema({
  name: String,
  age: Number,
  pregnancyStatus: {
    type: String,
    enum: ["pregnant", "postpartum"],
    required: true,
  },
  gestationWeeks: { type: Number, required: true },
  gravida: { type: String, required: true },
  para: { type: String, required: true },
  antenatalVisits: { type: String, required: true },
  riskFactors: [{ type: String }],
  complications: [{ type: String }],
  vitals: {
    bloodPressure: { type: String, required: true },
    weight: { type: String, required: true },
    hemoglobin: { type: String, required: true },
  },
  nextVisitDate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MaternalRecord", MaternalSchema);
