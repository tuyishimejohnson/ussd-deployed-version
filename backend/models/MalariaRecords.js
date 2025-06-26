const mongoose = require("mongoose");

const MalariaRecordSchema = new mongoose.Schema({
  symptoms: {
    type: [String],
    default: [],
  },
  testResult: {
    type: String,
    enum: ["positive", "negative", "pending"],
    default: "pending",
  },
  testType: {
    type: String,
    enum: ["rapid_diagnostic", "microscopy", "clinical_diagnosis"],
    default: "rapid_diagnostic",
  },
  severity: {
    type: String,
    enum: ["mild", "moderate", "severe"],
    default: "mild",
  },
  treatmentGiven: {
    type: String,
    default: "",
  },
  treatmentDate: {
    type: String,
    default: () => new Date().toISOString().split("T")[0],
  },
  followUpDate: {
    type: String,
    default: "",
  },
  complications: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("MalariaRecord", MalariaRecordSchema);
