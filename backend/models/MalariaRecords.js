const mongoose = require("mongoose");

const MalariaRecordSchema = new mongoose.Schema({
  patientName: {
    type: String,
  },
  age: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  address: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  notes: {
    type: String,
  },
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
  },
  treatmentDate: {
    type: String,
  },
  followUpDate: {
    type: String,
  },
  complications: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("MalariaRecord", MalariaRecordSchema);
