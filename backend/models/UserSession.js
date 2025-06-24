const mongoose = require("mongoose");
const UserSessionSchema = new mongoose.Schema({
  phoneNumber: String,
  currentStep: { type: String, default: "language" },
  selectedLanguage: String,
  selectedDistrict: String,
  selectedSector: String,
  selectedCell: String,
  selectedVillage: String,
  selectedCHW: String,
  selectedCHWId: String,
  appointmentBooked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserSession", UserSessionSchema);
