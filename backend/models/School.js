const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  name: String,
  programs: [String]
});

module.exports = mongoose.model("School", schoolSchema);