const mongoose = require("mongoose");

const termSchema = new mongoose.Schema({
  termNumber: Number,

  selfStart: String,
  selfEnd: String,

  termStart: String,
  termEnd: String,

  termDurationMode: {
    type: String,
    enum: ["auto", "manual"],
    default: "auto"
  },

  activities: [
    {
      start: String,
      end: String
    }
  ],

  activityStart: String,
  activityEnd: String,

  holidays: [
    {
      start: String,
      end: String
    }
  ],

  assessmentStart: String,
  assessmentEnd: String,

  breakMode: {
    type: String,
    enum: ["auto", "manual", "none"],
    default: "auto"
  },

  breakStart: String,
  breakEnd: String
});

const yearSchema = new mongoose.Schema({
  yearNumber: Number,
  terms: [termSchema],
  dayWiseTable: [
    {
      termLabel: String,
      weekLabel: String,
      date: String,
      day: String,
      remarks: String,
      studentLedActivities: String,
      compensatoryWorkingDay: String,
      assessmentWeek: String,
      holidays: String,
      events: String,
      selfRegistration: String,
      breakColumn: String,
      isTermBegin: Boolean,
      isTermEnd: Boolean
    }
  ]
});

const almanacSchema = new mongoose.Schema({
  program: String,
  year: Number,

  batchStart: Number,
  batchEnd: Number,

  yearsData: [yearSchema]
}, { timestamps: true });

// Keep one almanac document per program/year/batch range.
almanacSchema.index(
  { program: 1, year: 1, batchStart: 1, batchEnd: 1 },
  { unique: true }
);

module.exports = mongoose.model("Almanac", almanacSchema);