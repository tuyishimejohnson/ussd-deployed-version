const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  district: { type: String, required: true },
  sector: { type: String, required: true },
  cell: { type: String, required: true },
  village: { type: String, required: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model("User", UserSchema);
