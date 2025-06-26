const mongoose = require("mongoose");

const NutritionRecordSchema = new mongoose.Schema(
  {
    childAge: {
      type: String,
      required: true,
    },
    weight: {
      type: String,
      required: true,
    },
    height: {
      type: String,
      required: true,
    },
    muac: {
      type: String,
      required: true,
    },
    nutritionStatus: {
      type: String,
      enum: ["normal", "moderate_malnutrition", "severe_malnutrition"],
      required: true,
    },
    feedingPractices: {
      type: [String],
      default: [],
    },
    interventionProvided: {
      type: [String],
      default: [],
    },
    caregiverEducation: {
      type: Boolean,
      required: true,
    },
    referralMade: {
      type: Boolean,
      required: true,
    },
    referralLocation: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NutritionRecord", NutritionRecordSchema);
