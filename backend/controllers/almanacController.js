const Almanac = require("../models/Almanac");
const Calendar = require("../models/Calendar");
const mongoose = require("mongoose");

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isMonday = (value) => {
  const date = parseDate(value);
  return Boolean(date) && date.getDay() === 1;
};

const isSunday = (value) => {
  const date = parseDate(value);
  return Boolean(date) && date.getDay() === 0;
};

const getNextMondayIso = (value) => {
  const date = parseDate(value);
  if (!date) return "";

  const next = new Date(date);
  const day = next.getDay();
  let diff = (8 - day) % 7;
  if (diff === 0) diff = 7;
  next.setDate(next.getDate() + diff);

  return next.toISOString().split("T")[0];
};

const getLastWeekStartIso = (rangeEndIso) => {
  const rangeEnd = parseDate(rangeEndIso);
  if (!rangeEnd) return "";

  const weekStart = new Date(rangeEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  return weekStart.toISOString().split("T")[0];
};

const getDurationInDays = (start, end) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 0;
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const getBreakReferenceEndDate = (term, termIndex) => (
  termIndex === 3 ? term.termEnd : term.assessmentEnd
);

const getExpectedNextSelfStart = (term, termIndex) => {
  const breakMode = term.breakMode || "auto";

  if (termIndex === 3) {
    if (breakMode !== "none" && term.breakEnd) {
      return getLastWeekStartIso(term.breakEnd);
    }

    return getNextMondayIso(term.termEnd);
  }

  if (breakMode === "none") {
    return getNextMondayIso(term.assessmentEnd);
  }

  if (termIndex === 2) {
    return getNextMondayIso(term.assessmentEnd);
  }

  if (term.breakStart) {
    return term.breakStart;
  }

  return getNextMondayIso(term.assessmentEnd);
};

const validateBreakRules = (yearsData, totalYears) => {
  for (let yearIndex = 0; yearIndex < yearsData.length; yearIndex += 1) {
    const yearItem = yearsData[yearIndex] || {};
    const terms = Array.isArray(yearItem.terms) ? yearItem.terms : [];

    for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
      const term = terms[termIndex] || {};
      const isLastTerm = yearIndex === totalYears - 1 && termIndex === terms.length - 1;
      const isNoBreakTerm = termIndex === 2;

      const requiresAssessmentWeek = termIndex !== 3;
      if (!term.selfStart || !term.selfEnd || !term.termStart || !term.termEnd
        || (requiresAssessmentWeek && (!term.assessmentStart || !term.assessmentEnd))) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} has incomplete dates`;
      }

      if (termIndex === 3) {
        if (!isMonday(term.termStart) || !isSunday(term.termEnd)) {
          return `Year ${yearIndex + 1} Term 4 duration must start Monday and end Sunday`;
        }

        const minFourthTermStart = getNextMondayIso(term.selfEnd);
        if (!minFourthTermStart || term.termStart < minFourthTermStart) {
          return `Year ${yearIndex + 1} Term 4 duration must start after self registration`;
        }

        const fourthTermDuration = getDurationInDays(term.termStart, term.termEnd);
        if (fourthTermDuration <= 0 || fourthTermDuration > 70) {
          return `Year ${yearIndex + 1} Term 4 duration must be between 1 and 70 days`;
        }
      }

      if (isLastTerm) {
        continue;
      }

      if (isNoBreakTerm) {
        if (term.breakStart || term.breakEnd || (term.breakMode && term.breakMode !== "none")) {
          return `Year ${yearIndex + 1} Term 3 must not have break`;
        }
        continue;
      }

      const breakMode = term.breakMode || "auto";
      const hasPartialBreak = (term.breakStart && !term.breakEnd) || (!term.breakStart && term.breakEnd);
      if (hasPartialBreak) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} break must include start and end`;
      }

      if (breakMode === "none") {
        if (term.breakStart || term.breakEnd) {
          return `Year ${yearIndex + 1} Term ${termIndex + 1} break should be empty when removed`;
        }
        continue;
      }

      if (!term.breakStart || !term.breakEnd) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} break is required unless removed`;
      }

      if (!isMonday(term.breakStart) || !isSunday(term.breakEnd)) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} break must start Monday and end Sunday`;
      }

      const minBreakStart = getNextMondayIso(getBreakReferenceEndDate(term, termIndex));
      if (!minBreakStart || term.breakStart < minBreakStart) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} break must start after assessment week`;
      }

      const duration = getDurationInDays(term.breakStart, term.breakEnd);
      if (duration <= 0 || duration > 21) {
        return `Year ${yearIndex + 1} Term ${termIndex + 1} break must be between 1 and 21 days`;
      }
    }
  }

  for (let yearIndex = 0; yearIndex < yearsData.length; yearIndex += 1) {
    const terms = Array.isArray(yearsData[yearIndex]?.terms) ? yearsData[yearIndex].terms : [];

    for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
      const current = terms[termIndex] || {};

      let nextYearIndex = yearIndex;
      let nextTermIndex = termIndex + 1;
      if (nextTermIndex >= terms.length) {
        nextYearIndex = yearIndex + 1;
        nextTermIndex = 0;
      }

      if (nextYearIndex >= yearsData.length) {
        continue;
      }

      const nextTerm = yearsData[nextYearIndex]?.terms?.[nextTermIndex] || {};
      if (!nextTerm.selfStart) {
        return `Year ${nextYearIndex + 1} Term ${nextTermIndex + 1} self registration is missing`;
      }

      const expectedNextSelfStart = getExpectedNextSelfStart(current, termIndex);

      if (!expectedNextSelfStart || nextTerm.selfStart !== expectedNextSelfStart) {
        return `Year ${nextYearIndex + 1} Term ${nextTermIndex + 1} self registration sequence is invalid`;
      }
    }
  }

  return "";
};

exports.saveAlmanac = async (req, res) => {
  try {
    const { program, year, batchStart, batchEnd, yearsData } = req.body;

    if (!program || !year || !batchStart || !batchEnd || !Array.isArray(yearsData)) {
      return res.status(400).json({ message: "Missing required almanac fields" });
    }

    const parsedYear = Number(year);
    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedYear) || Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      return res.status(400).json({ message: "Year and batch values must be numbers" });
    }

    if (parsedBatchEnd < parsedBatchStart) {
      return res.status(400).json({ message: "Batch end cannot be smaller than batch start" });
    }

    if (yearsData.length !== parsedYear) {
      return res.status(400).json({ message: "Years data does not match selected year count" });
    }

    const breakRuleMessage = validateBreakRules(yearsData, parsedYear);
    if (breakRuleMessage) {
      return res.status(400).json({ message: breakRuleMessage });
    }

    const filter = {
      program,
      year: parsedYear,
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    };

    const existing = await Almanac.findOne(filter).lean();

    // Check if batch already exists - prevent duplicates
    if (existing) {
      return res.status(409).json({ 
        message: `This batch is already created for ${program} (${parsedBatchStart}-${parsedBatchEnd}). Please edit the existing batch or create a new batch.`
      });
    }

    const savedAlmanac = await Almanac.create({
      program,
      year: parsedYear,
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd,
      yearsData
    });

    res.json({
      message: "Almanac saved for this batch ✅",
      almanac: savedAlmanac
    });

  } catch (error) {
    console.error("BACKEND ERROR:", error);
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Duplicate almanac detected for this selection. Please open the existing batch and edit it."
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getAlmanacBatches = async (req, res) => {
  try {
    const batches = await Almanac.find(
      {},
      {
        _id: 1,
        program: 1,
        year: 1,
        batchStart: 1,
        batchEnd: 1,
        updatedAt: 1
      }
    )
      .sort({ batchStart: -1, batchEnd: -1, program: 1, year: 1 })
      .lean();

    res.json(batches);
  } catch (error) {
    console.error("BATCH LIST ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAlmanacById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("GET ALMANAC REQUEST:", {
      id,
      params: req.params,
      url: req.originalUrl,
      method: req.method
    });

    if (!id) {
      return res.status(400).json({ message: "Almanac id is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid almanac id format" });
    }

    const almanac = await Almanac.findById(id).lean();

    if (!almanac) {
      return res.status(404).json({ message: "Almanac not found" });
    }

    res.json(almanac);
  } catch (error) {
    console.error("GET ALMANAC ERROR:", {
      id: req.params?.id,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.saveDayWiseTable = async (req, res) => {
  try {
    const { id, yearNumber } = req.params;
    const {
      rows,
      schoolName,
      program,
      batchStart,
      batchEnd,
      totalYears,
      yearHeading
    } = req.body;

    const parsedYearNumber = Number(yearNumber);
    if (Number.isNaN(parsedYearNumber) || parsedYearNumber <= 0) {
      return res.status(400).json({ message: "Invalid year number" });
    }

    if (!Array.isArray(rows)) {
      return res.status(400).json({ message: "Rows must be an array" });
    }

    const sanitizedRows = rows.map((item) => ({
      termLabel: String(item?.termLabel || "").trim(),
      weekLabel: String(item?.weekLabel || "-").trim() || "-",
      date: String(item?.date || "").trim(),
      day: String(item?.day || "-").trim() || "-",
      remarks: String(item?.remarks || "-").trim() || "-",
      studentLedActivities: String(item?.studentLedActivities || "").trim(),
      compensatoryWorkingDay: String(item?.compensatoryWorkingDay || "").trim(),
      assessmentWeek: String(item?.assessmentWeek || "").trim(),
      holidays: String(item?.holidays || "").trim(),
      events: String(item?.events || "").trim(),
      selfRegistration: String(item?.selfRegistration || "").trim(),
      breakColumn: String(item?.breakColumn || "").trim(),
      isTermBegin: Boolean(item?.isTermBegin),
      isTermEnd: Boolean(item?.isTermEnd),
      isResultsDay: Boolean(item?.isResultsDay)
    }));

    await Calendar.findOneAndUpdate(
      { almanacId: id, yearNumber: parsedYearNumber },
      {
        $set: {
          almanacId: id,
          schoolName: String(schoolName || "School").trim(),
          program: String(program || "").trim(),
          batchStart: Number(batchStart),
          batchEnd: Number(batchEnd),
          totalYears: Number(totalYears),
          yearNumber: parsedYearNumber,
          yearHeading: String(yearHeading || `Year ${parsedYearNumber}`).trim(),
          rows: sanitizedRows
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      message: "Day-wise table saved for selected batch and year",
      almanacId: id,
      yearNumber: parsedYearNumber,
      totalRows: sanitizedRows.length
    });
  } catch (error) {
    console.error("SAVE DAY-WISE TABLE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSavedCalendar = async (req, res) => {
  try {
    const { id, yearNumber } = req.params;
    const parsedYearNumber = Number(yearNumber);

    if (Number.isNaN(parsedYearNumber) || parsedYearNumber <= 0) {
      return res.status(400).json({ message: "Invalid year number" });
    }

    const deleted = await Calendar.findOneAndDelete({ almanacId: id, yearNumber: parsedYearNumber });

    if (!deleted) {
      return res.status(404).json({ message: "Saved calendar not found" });
    }

    res.json({
      message: "Saved calendar deleted successfully",
      almanacId: id,
      yearNumber: parsedYearNumber
    });
  } catch (error) {
    console.error("DELETE SAVED CALENDAR ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAlmanacBatchRange = async (req, res) => {
  try {
    const { batchStart, batchEnd } = req.params;
    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      return res.status(400).json({ message: "Batch values must be numbers" });
    }

    const result = await Almanac.deleteMany({
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    });

    const deletedCalendars = await Calendar.deleteMany({
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    });

    res.json({
      message: "Saved almanac batch deleted successfully",
      deletedCount: result.deletedCount || 0,
      deletedCalendarCount: deletedCalendars.deletedCount || 0,
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    });
  } catch (error) {
    console.error("DELETE BATCH RANGE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAlmanacById = async (req, res) => {
  try {
    const deleted = await Almanac.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Almanac not found" });
    }

    const deletedCalendars = await Calendar.deleteMany({
      almanacId: req.params.id
    });

    res.json({
      message: "Saved almanac deleted successfully",
      almanacId: req.params.id,
      deletedCalendarCount: deletedCalendars.deletedCount || 0
    });
  } catch (error) {
    console.error("DELETE ALMANAC ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getSavedCalendarByAlmanacYear = async (req, res) => {
  try {
    const { id, yearNumber } = req.params;
    const parsedYearNumber = Number(yearNumber);

    if (Number.isNaN(parsedYearNumber) || parsedYearNumber <= 0) {
      return res.status(400).json({ message: "Invalid year number" });
    }

    const savedCalendar = await Calendar.findOne({ almanacId: id, yearNumber: parsedYearNumber }).lean();

    if (!savedCalendar) {
      return res.status(404).json({ message: "Saved calendar not found" });
    }

    res.json(savedCalendar);
  } catch (error) {
    console.error("GET SAVED CALENDAR ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getSavedCalendars = async (req, res) => {
  try {
    const calendars = await Calendar.find(
      {},
      {
        schoolName: 1,
        program: 1,
        batchStart: 1,
        batchEnd: 1,
        totalYears: 1,
        yearNumber: 1,
        yearHeading: 1,
        rows: 1,
        updatedAt: 1
      }
    )
      .sort({ updatedAt: -1, batchStart: -1 })
      .lean();

    const savedCalendars = [];

    calendars.forEach((calendar) => {
      if (!Array.isArray(calendar.rows) || !calendar.rows.length) return;

      savedCalendars.push({
        calendarId: calendar._id,
        almanacId: calendar.almanacId,
        schoolName: calendar.schoolName,
        program: calendar.program,
        totalYears: Number(calendar.totalYears || 0),
        batchStart: calendar.batchStart,
        batchEnd: calendar.batchEnd,
        yearNumber: Number(calendar.yearNumber || 0),
        yearHeading: calendar.yearHeading,
        totalRows: calendar.rows.length,
        updatedAt: calendar.updatedAt
      });
    });

    res.json(savedCalendars);
  } catch (error) {
    console.error("SAVED CALENDARS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSavedCalendarById = async (req, res) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId || !mongoose.Types.ObjectId.isValid(calendarId)) {
      return res.status(400).json({ message: "Invalid calendar id format" });
    }

    const deleted = await Calendar.findByIdAndDelete(calendarId);
    if (!deleted) {
      return res.status(404).json({ message: "Saved calendar not found" });
    }

    res.json({
      message: "Saved calendar deleted successfully",
      calendarId
    });
  } catch (error) {
    console.error("DELETE SAVED CALENDAR BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getSavedCalendarById = async (req, res) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId || !mongoose.Types.ObjectId.isValid(calendarId)) {
      return res.status(400).json({ message: "Invalid calendar id format" });
    }

    const calendar = await Calendar.findById(calendarId).lean();
    if (!calendar) {
      return res.status(404).json({ message: "Saved calendar not found" });
    }

    res.json(calendar);
  } catch (error) {
    console.error("GET SAVED CALENDAR BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateAlmanacById = async (req, res) => {
  try {
    const { id } = req.params;
    const { program, year, batchStart, batchEnd, yearsData } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid almanac id format" });
    }

    if (!program || !year || !batchStart || !batchEnd || !Array.isArray(yearsData)) {
      return res.status(400).json({ message: "Missing required almanac fields" });
    }

    const parsedYear = Number(year);
    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedYear) || Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      return res.status(400).json({ message: "Year and batch values must be numbers" });
    }

    if (parsedBatchEnd < parsedBatchStart) {
      return res.status(400).json({ message: "Batch end cannot be smaller than batch start" });
    }

    if (yearsData.length !== parsedYear) {
      return res.status(400).json({ message: "Years data does not match selected year count" });
    }

    const breakRuleMessage = validateBreakRules(yearsData, parsedYear);
    if (breakRuleMessage) {
      return res.status(400).json({ message: breakRuleMessage });
    }

    const existing = await Almanac.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Almanac not found" });
    }

    const duplicate = await Almanac.findOne({
      _id: { $ne: id },
      program,
      year: parsedYear,
      batchStart: parsedBatchStart,
      batchEnd: parsedBatchEnd
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        message: `Another almanac already exists for ${program} (${parsedBatchStart}-${parsedBatchEnd}).`
      });
    }

    existing.program = program;
    existing.year = parsedYear;
    existing.batchStart = parsedBatchStart;
    existing.batchEnd = parsedBatchEnd;
    existing.yearsData = yearsData;

    const updatedAlmanac = await existing.save();

    res.json({
      message: "Almanac is updated successfully",
      almanac: updatedAlmanac
    });
  } catch (error) {
    console.error("UPDATE ALMANAC ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};