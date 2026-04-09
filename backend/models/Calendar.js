const mongoose = require("mongoose");

const savedRowSchema = new mongoose.Schema(
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
    isTermEnd: Boolean,
    isResultsDay: Boolean
  },
  { _id: false }
);

const calendarSchema = new mongoose.Schema(
  {
    almanacId: String,
    schoolName: String,
    program: String,
    batchStart: Number,
    batchEnd: Number,
    totalYears: Number,
    yearNumber: Number,
    yearHeading: String,
    rows: [savedRowSchema]
  },
  { timestamps: true }
);

calendarSchema.index({ almanacId: 1, yearNumber: 1 }, { unique: true });

module.exports = mongoose.model("Calendar", calendarSchema);