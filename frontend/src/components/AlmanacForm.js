import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  isMonday,
  isSunday,
  getNextMonday,
  addWeeks
} from "../utils/dateUtils";
import { getYearLabels } from "../utils/yearLabels";
import WarningModal from "./WarningModal";
import "./Almanac.css";

function AlmanacForm() {

  const location = useLocation();
  const { program, year } = location.state || {};

  const yearNames = getYearLabels(Number(year));

  // 🔥 NEW: BATCH STATES
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [existingAlmanacId, setExistingAlmanacId] = useState("");
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const showWarningModal = (msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
  };

  const invalidDateMessage = "❌ Select the date within term duration";

  // 🔥 CREATE TERM
  const createTerm = (termNumber) => ({
    termNumber,
    selfStart: "",
    selfEnd: "",
    termStart: "",
    termEnd: "",
    termDurationMode: "auto",
    activities: [{ start: "", end: "" }],
    activityStart: "",
    activityEnd: "",
    holidays: [{ start: "", end: "" }],
    assessmentStart: "",
    assessmentEnd: "",
    termEndManual: false,
    termDurationBaseWeeks: 10,
    breakMode: "none",
    breakStart: "",
    breakEnd: ""
  });

  // 🔥 CREATE YEAR
  const createYear = (yearNumber) => ({
    yearNumber,
    terms: [
      createTerm(1),
      createTerm(2),
      createTerm(3),
      createTerm(4)
    ]
  });

  const [yearsData, setYearsData] = useState(
    Array.from({ length: Number(year || 0) }, (_, i) => createYear(i + 1))
  );

  const createDefaultYearsData = useCallback(() => (
    Array.from({ length: Number(year || 0) }, (_, i) => createYear(i + 1))
  ), [year]);

  const getNextTermRef = (yearIndex, termIndex) => {
    if (termIndex < 3) {
      return { yearIndex, termIndex: termIndex + 1 };
    }
    if (yearIndex < yearsData.length - 1) {
      return { yearIndex: yearIndex + 1, termIndex: 0 };
    }
    return null;
  };

  const getPreviousTermRef = (yearIndex, termIndex) => {
    if (termIndex > 0) {
      return { yearIndex, termIndex: termIndex - 1 };
    }
    if (yearIndex > 0) {
      return { yearIndex: yearIndex - 1, termIndex: 3 };
    }
    return null;
  };

  const isLastTerm = (yearIndex, termIndex) => (
    yearIndex === yearsData.length - 1 && termIndex === 3
  );

  const isNoBreakTerm = (termIndex) => termIndex === 2;

  const getPreviewBreakValue = (term, yearIndex, termIndex) => {
    if (isNoBreakTerm(termIndex) || isLastTerm(yearIndex, termIndex)) {
      return "—";
    }

    if (!term.breakStart || !term.breakEnd) {
      return "—";
    }

    return toRange(term.breakStart, term.breakEnd);
  };

  const getAssessmentDisplayValue = (term, termIndex) => {
    if (termIndex === 3) {
      return "-";
    }

    return toRange(term.assessmentStart, term.assessmentEnd);
  };

  const cloneYearsData = (data) => (
    data.map((yearItem) => ({
      ...yearItem,
      terms: (yearItem.terms || []).map((termItem) => ({
        ...termItem,
        termDurationMode: termItem.termDurationMode || "auto",
        breakMode: termItem.breakMode || (termItem.breakStart && termItem.breakEnd ? "auto" : "none"),
        activities: (termItem.activities && termItem.activities.length > 0
          ? termItem.activities
          : [{ start: termItem.activityStart || "", end: termItem.activityEnd || "" }
          ]).map((activity) => ({ ...activity })),
        holidays: (termItem.holidays || []).map((holiday) => ({ ...holiday }))
      }))
    }))
  );

  const getNormalizedYearsDataForSubmit = (data) => {
    const totalYears = Array.isArray(data) ? data.length : 0;

    return (data || []).map((yearItem, yearIndex) => ({
      ...yearItem,
      terms: (yearItem.terms || []).map((termItem, termIndex) => {
        const hasBreakDates = Boolean(termItem.breakStart && termItem.breakEnd);
        const isFourthTerm = termIndex === 3;
        const isThirdTerm = termIndex === 2;
        const isFinalTerm = yearIndex === totalYears - 1 && isFourthTerm;

        let normalizedBreakMode = termItem.breakMode || (hasBreakDates ? "auto" : "none");

        if (!hasBreakDates || isThirdTerm || isFinalTerm) {
          normalizedBreakMode = "none";
        }

        const { termEndManual, termDurationBaseWeeks, ...restTermItem } = termItem;

        return {
          ...termItem,
          termDurationMode: isFourthTerm
            ? (termItem.termDurationMode || "auto")
            : "auto",
          assessmentStart: isFourthTerm ? "" : (termItem.assessmentStart || ""),
          assessmentEnd: isFourthTerm ? "" : (termItem.assessmentEnd || ""),
          breakMode: normalizedBreakMode,
          breakStart: normalizedBreakMode === "none" ? "" : (termItem.breakStart || ""),
          breakEnd: normalizedBreakMode === "none" ? "" : (termItem.breakEnd || ""),
          activities: (termItem.activities && termItem.activities.length > 0
            ? termItem.activities
            : [{ start: termItem.activityStart || "", end: termItem.activityEnd || "" }
            ]).map((activity) => ({ ...activity })),
          holidays: (termItem.holidays || []).map((holiday) => ({ ...holiday }))
        };
      })
    }));
  };

  const getActivities = (term) => {
    const activities = term.activities && term.activities.length > 0
      ? term.activities
      : [{ start: term.activityStart || "", end: term.activityEnd || "" }];

    return activities;
  };

  const toIso = (dateValue) => new Date(dateValue).toISOString().split("T")[0];

  const getWeekEndFromStart = (weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd.toISOString().split("T")[0];
  };

  const isWeekOverlap = (startA, endA, startB, endB) => {
    if (!startA || !endA || !startB || !endB) return false;
    return !(endA < startB || endB < startA);
  };

  const getDurationInDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getDefaultBreakRange = (referenceEndDate, weekCount = 1) => {
    const breakStartDate = getNextMonday(new Date(referenceEndDate));
    const breakEndDate = addWeeks(breakStartDate, weekCount);
    breakEndDate.setDate(breakEndDate.getDate() - 1);

    return {
      breakStart: toIso(breakStartDate),
      breakEnd: toIso(breakEndDate)
    };
  };

  const getLastWeekStartFromRange = (rangeEndIso) => {
    if (!rangeEndIso) return "";

    const rangeEndDate = new Date(rangeEndIso);
    if (Number.isNaN(rangeEndDate.getTime())) {
      return "";
    }

    rangeEndDate.setDate(rangeEndDate.getDate() - 6);
    return toIso(rangeEndDate);
  };

  const getNextSelfStartFromReferenceEnd = (referenceEndDate) => {
    if (!referenceEndDate) {
      return "";
    }

    return toIso(getNextMonday(new Date(referenceEndDate)));
  };

  const getBreakReferenceEndDate = (term, termIndex) => (
    termIndex === 3 ? term.termEnd : term.assessmentEnd
  );

  const getExpectedNextSelfStart = (term, termIndex) => {
    if (termIndex === 3) {
      if (term.breakMode !== "none" && term.breakEnd) {
        return getLastWeekStartFromRange(term.breakEnd);
      }

      return getNextSelfStartFromReferenceEnd(term.termEnd);
    }

    if (term.breakMode === "none") {
      return term.assessmentStart || getNextSelfStartFromReferenceEnd(term.assessmentEnd);
    }

    if (termIndex === 2) {
      return term.assessmentStart || getNextSelfStartFromReferenceEnd(term.assessmentEnd);
    }

    if (term.breakStart) {
      return term.breakStart;
    }

    return getNextSelfStartFromReferenceEnd(term.assessmentEnd);
  };

  const recalculateTerm = (term, termIndex) => {
    if (!term.termStart) {
      term.termEnd = "";
      term.assessmentStart = "";
      term.assessmentEnd = "";
      term.termDurationBaseWeeks = 10;
      term.termEndManual = false;
      return;
    }

    const activityCount = getActivities(term).filter((a) => a.start).length;
    const holidayCount = (term.holidays || []).filter((h) => h.start).length;

    let baseWeeks = 10;
    if (termIndex === 3 && term.termEndManual) {
      const parsedBaseWeeks = Number(term.termDurationBaseWeeks);
      if (Number.isFinite(parsedBaseWeeks) && parsedBaseWeeks > 0) {
        baseWeeks = parsedBaseWeeks;
      }
    }

    const weeks = baseWeeks + activityCount + holidayCount;

    const firstFilledActivity = getActivities(term).find((a) => a.start && a.end);
    term.activityStart = firstFilledActivity?.start || "";
    term.activityEnd = firstFilledActivity?.end || "";

    const holidayCount = (term.holidays || []).filter((h) => h.start).length;
    weeks += holidayCount;

    const defaultTermEnd = (() => {
      const termEndDate = addWeeks(new Date(term.termStart), weeks);
      termEndDate.setDate(termEndDate.getDate() - 1);
      return toIso(termEndDate);
    })();

    if (termIndex === 3) {
      const minFourthTermStart = term.selfEnd
        ? toIso(getNextMonday(new Date(term.selfEnd)))
        : "";

      const hasManualDuration = term.termDurationMode === "manual";
      if (hasManualDuration) {
        const hasBothDates = Boolean(term.termStart && term.termEnd);
        if (hasBothDates) {
          const duration = getDurationInDays(term.termStart, term.termEnd);
          const isValidManualRange = (!minFourthTermStart || term.termStart >= minFourthTermStart)
            && isMonday(term.termStart)
            && isSunday(term.termEnd)
            && duration > 0
            && duration <= 70;

          if (!isValidManualRange) {
            term.termDurationMode = "auto";
            term.termStart = minFourthTermStart || term.termStart;
            term.termEnd = defaultTermEnd;
          }
        } else {
          term.termDurationMode = "auto";
          term.termEnd = defaultTermEnd;
        }
      } else {
        term.termDurationMode = "auto";
        term.termEnd = defaultTermEnd;
      }

      term.assessmentStart = "";
      term.assessmentEnd = "";
      return;
    }

    term.termEnd = defaultTermEnd;

    const assessmentStartDate = getNextMonday(new Date(term.termEnd));
    const assessmentEndDate = addWeeks(assessmentStartDate, 1);
    assessmentEndDate.setDate(assessmentEndDate.getDate() - 1);

    term.assessmentStart = toIso(assessmentStartDate);
    term.assessmentEnd = toIso(assessmentEndDate);
  };

  const syncBreakForTerm = (term, yearIndex, termIndex, data) => {
    if (isNoBreakTerm(termIndex)) {
      term.breakMode = "none";
      term.breakStart = "";
      term.breakEnd = "";
      return;
    }

    if (isLastTerm(yearIndex, termIndex)) {
      term.breakMode = "none";
      term.breakStart = "";
      term.breakEnd = "";
      return;
    }

    const breakReferenceEndDate = getBreakReferenceEndDate(term, termIndex);

    if (!breakReferenceEndDate) {
      term.breakStart = "";
      term.breakEnd = "";
      return;
    }

    if (term.breakMode === "none") {
      term.breakStart = "";
      term.breakEnd = "";
      return;
    }

    if (term.breakMode === "manual" && term.breakStart && term.breakEnd) {
      const minBreakStart = toIso(getNextMonday(new Date(breakReferenceEndDate)));
      const duration = getDurationInDays(term.breakStart, term.breakEnd);

      if (
        term.breakStart < minBreakStart ||
        !isMonday(term.breakStart) ||
        !isSunday(term.breakEnd) ||
        duration <= 0 ||
        duration > 21
      ) {
        showWarningModal(`Invalid break in Year ${yearIndex + 1} Term ${termIndex + 1}. Auto break applied.`);
        term.breakMode = "auto";
      }
    }

    if (term.breakMode === "auto" || !term.breakStart || !term.breakEnd) {
      const defaultBreakWeeks = termIndex === 3 ? 3 : 1;
      const { breakStart, breakEnd } = getDefaultBreakRange(breakReferenceEndDate, defaultBreakWeeks);
      term.breakStart = breakStart;
      term.breakEnd = breakEnd;
    }
  };

  const regenerateTimeline = (data) => {
    const firstTerm = data[0]?.terms?.[0];
    if (!firstTerm?.selfStart) {
      return;
    }

    for (let y = 0; y < data.length; y += 1) {
      for (let t = 0; t < 4; t += 1) {
        const term = data[y].terms[t];

        if (y === 0 && t === 0) {
          if (!term.selfStart) {
            return;
          }
        } else {
          const prevRef = getPreviousTermRef(y, t);
          if (!prevRef) continue;
          const prevTerm = data[prevRef.yearIndex].terms[prevRef.termIndex];

          const expectedSelfStart = getExpectedNextSelfStart(prevTerm, prevRef.termIndex);

          if (!expectedSelfStart) {
            term.selfStart = "";
            term.selfEnd = "";
            term.termStart = "";
            term.termEnd = "";
            term.assessmentStart = "";
            term.assessmentEnd = "";
            term.breakStart = "";
            term.breakEnd = "";
            continue;
          }

          term.selfStart = expectedSelfStart;
        }

        if (term.selfStart) {
          term.selfEnd = getWeekEndFromStart(term.selfStart);
          const generatedTermStart = toIso(getNextMonday(new Date(term.selfEnd)));
          const keepManualTermDuration = t === 3
            && term.termDurationMode === "manual"
            && term.termStart
            && term.termEnd;

          if (!keepManualTermDuration) {
            term.termStart = generatedTermStart;
          }
        } else {
          term.selfEnd = "";
          term.termStart = "";
        }

        recalculateTerm(term, t);
        syncBreakForTerm(term, y, t, data);
      }
    }
  };

  // ✅ BATCH DATE VALIDATION
  const isDateWithinBatchRange = (dateString) => {
    if (!batchStart || !batchEnd) return true; // No batch selected yet, allow all dates
    
    const date = new Date(dateString);
    const dateYear = date.getFullYear();
    const start = Number(batchStart);
    const end = Number(batchEnd);
    
    return dateYear >= start && dateYear <= end;
  };

  // ✅ BATCH START HANDLER
  const handleBatchStartChange = (e) => {
    const start = e.target.value;
    setBatchStart(start);
    
    if (start) {
      const startYear = Number(start);
      const endYear = startYear + Number(year);
      setBatchEnd(String(endYear));
    } else {
      setBatchEnd("");
    }
  };

  useEffect(() => {
    const loadExistingAlmanac = async () => {
      if (!program || !year || !batchStart || !batchEnd) {
        setExistingAlmanacId("");
        return;
      }

      const parsedBatchStart = Number(batchStart);
      const parsedBatchEnd = Number(batchEnd);
      const parsedYear = Number(year);

      if (Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd) || Number.isNaN(parsedYear)) {
        setExistingAlmanacId("");
        return;
      }

      try {
        setIsLoadingExisting(true);
        const batchesRes = await axios.get("http://localhost:5000/api/almanac/batches");
        const matchingBatch = (batchesRes.data || []).find((item) =>
          String(item.program || "").trim().toLowerCase() === String(program || "").trim().toLowerCase()
          && Number(item.year) === parsedYear
          && Number(item.batchStart) === parsedBatchStart
          && Number(item.batchEnd) === parsedBatchEnd
        );

        if (!matchingBatch?._id) {
          setExistingAlmanacId("");
          setYearsData(createDefaultYearsData());
          return;
        }

        const almanacRes = await axios.get(`http://localhost:5000/api/almanac/${matchingBatch._id}`);
        const loadedYearsData = Array.isArray(almanacRes?.data?.yearsData)
          ? cloneYearsData(almanacRes.data.yearsData)
          : createDefaultYearsData();

        setExistingAlmanacId(matchingBatch._id);
        setYearsData(loadedYearsData);
      } catch (error) {
        console.error("Load existing almanac error:", error);
        setExistingAlmanacId("");
      } finally {
        setIsLoadingExisting(false);
      }
    };

    loadExistingAlmanac();
  }, [program, year, batchStart, batchEnd, createDefaultYearsData]);

  // ✅ SELF START (Year 1 Term 1 drives the full timeline)
  const handleSelfStart = (y, t, value) => {
    if (!(y === 0 && t === 0)) {
      showWarningModal("Only Year 1 Term 1 self registration is editable. Other terms are auto-generated.");
      return;
    }

    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    // Validate batch year is valid (4-digit format yyyy)
    if (!/^\d{4}$/.test(batchStart)) {
      showWarningModal("❌ Please select valid batch year");
      return;
    }

    if (!value) {
      const updated = cloneYearsData(yearsData);
      updated.forEach((yearItem) => {
        yearItem.terms.forEach((termItem) => {
          termItem.selfStart = "";
          termItem.selfEnd = "";
          termItem.termStart = "";
          termItem.termEnd = "";
          termItem.assessmentStart = "";
          termItem.assessmentEnd = "";
          termItem.breakStart = "";
          termItem.breakEnd = "";
        });
      });
      setYearsData(updated);
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    if (!isMonday(value)) {
      showWarningModal("❌ Only Monday allowed");
      return;
    }

    const updated = cloneYearsData(yearsData);
    updated[y].terms[t].selfStart = value;
    regenerateTimeline(updated);
    setYearsData(updated);
  };

  // ✅ ACTIVITY
  const handleActivity = (y, t, activityIndex, value) => {
    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    if (!isMonday(value)) {
      showWarningModal("❌ Activity must start Monday");
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];
    const activities = getActivities(term);
    const activity = activities[activityIndex];

    if (!term.selfStart || !term.termStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    if (!value) {
      activity.start = "";
      activity.end = "";
      regenerateTimeline(updated);
      setYearsData(updated);
      return;
    }

    if (value < term.termStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    if (term.assessmentStart && value >= term.assessmentStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    const activityEnd = getWeekEndFromStart(value);
    const hasHolidayOverlap = (term.holidays || []).some((holiday) =>
      holiday.start && holiday.end && isWeekOverlap(value, activityEnd, holiday.start, holiday.end)
    );

    if (hasHolidayOverlap) {
      showWarningModal("❌ This week is already assigned");
      return;
    }

    const duplicateActivityWeek = activities.some((existing, index) => {
      if (index === activityIndex || !existing.start || !existing.end) return false;
      return isWeekOverlap(value, activityEnd, existing.start, existing.end);
    });

    if (duplicateActivityWeek) {
      showWarningModal("❌ This week is already assigned");
      return;
    }

    activity.start = value;
    activity.end = getWeekEndFromStart(value);

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const addActivity = (y, t) => {
    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];
    const activities = getActivities(term);
    activities.push({ start: "", end: "" });
    term.activities = activities;
    setYearsData(updated);
  };

  const removeActivity = (y, t, activityIndex) => {
    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];
    const activities = getActivities(term);

    activities.splice(activityIndex, 1);
    term.activities = activities.length > 0 ? activities : [{ start: "", end: "" }];

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  // ✅ HOLIDAY
  const handleHoliday = (y, t, h, value) => {
    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    if (!isMonday(value)) {
      showWarningModal("❌ Holiday must start Monday");
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];
    const holiday = term.holidays[h];

    // Strict sequence validation: holiday must belong to the active term window.
    if (!term.selfStart || !term.termStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    if (!value) {
      holiday.start = "";
      holiday.end = "";
      regenerateTimeline(updated);
      setYearsData(updated);
      return;
    }

    if (value < term.termStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    if (term.assessmentStart && value >= term.assessmentStart) {
      showWarningModal(invalidDateMessage);
      return;
    }

    const holidayEnd = getWeekEndFromStart(value);
    const hasActivityOverlap = getActivities(term).some((activity) => (
      activity.start && activity.end && isWeekOverlap(value, holidayEnd, activity.start, activity.end)
    ));

    if (hasActivityOverlap) {
      showWarningModal("❌ This week is already assigned");
      return;
    }

    const duplicateHolidayWeek = (term.holidays || []).some((existingHoliday, index) => {
      if (index === h || !existingHoliday.start || !existingHoliday.end) return false;
      return isWeekOverlap(value, holidayEnd, existingHoliday.start, existingHoliday.end);
    });

    if (duplicateHolidayWeek) {
      showWarningModal("❌ This week is already assigned");
      return;
    }

    holiday.start = value;
    holiday.end = getWeekEndFromStart(value);

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const addHoliday = (y, t) => {
    const updated = cloneYearsData(yearsData);
    updated[y].terms[t].holidays.push({ start: "", end: "" });
    setYearsData(updated);
  };

  const removeHoliday = (y, t, h) => {
    const updated = cloneYearsData(yearsData);
    const holidays = updated[y].terms[t].holidays || [];
    holidays.splice(h, 1);
    updated[y].terms[t].holidays = holidays.length > 0 ? holidays : [{ start: "", end: "" }];
    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const handleBreakModeChange = (y, t, mode) => {
    if (isLastTerm(y, t) || isNoBreakTerm(t)) {
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];

    term.breakMode = mode;
    if (mode === "none" || mode === "auto") {
      term.breakStart = "";
      term.breakEnd = "";
    }

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const handleFourthTermEndDate = (y, t, value) => {
    if (t !== 3) {
      return;
    }

    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];

    if (!value) {
      term.termEnd = "";
      term.termEndManual = false;
      term.termDurationBaseWeeks = 10;
      regenerateTimeline(updated);
      setYearsData(updated);
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    if (!term.termStart || value < term.termStart) {
      showWarningModal("❌ Term completion cannot be before commencement");
      return;
    }

    const manualDurationDays = getDurationInDays(term.termStart, value);
    const manualDurationWeeks = Math.ceil(manualDurationDays / 7);
    const activityCount = getActivities(term).filter((item) => item.start).length;
    const holidayCount = (term.holidays || []).filter((item) => item.start).length;
    const baseWeeks = manualDurationWeeks - activityCount - holidayCount;

    if (baseWeeks <= 0) {
      showWarningModal("❌ Term duration is too short for selected activity/holiday weeks");
      return;
    }

    term.termEnd = value;
    term.termEndManual = true;
    term.termDurationBaseWeeks = baseWeeks;

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const handleBreakDate = (y, t, field, value) => {
    if (isLastTerm(y, t) || isNoBreakTerm(t)) {
      return;
    }

    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];

    if (!value) {
      term.breakMode = "manual";
      term[field] = "";
      regenerateTimeline(updated);
      setYearsData(updated);
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    if (field === "breakStart" && !isMonday(value)) {
      showWarningModal("❌ Break must start on Monday");
      return;
    }

    if (field === "breakEnd" && !isSunday(value)) {
      showWarningModal("❌ Break must end on Sunday");
      return;
    }

    const breakReferenceEndDate = getBreakReferenceEndDate(term, t);

    if (!breakReferenceEndDate) {
      showWarningModal(invalidDateMessage);
      return;
    }

    term.breakMode = "manual";
    term[field] = value;

    if (term.breakStart && term.breakEnd) {
      const minBreakStart = toIso(getNextMonday(new Date(breakReferenceEndDate)));
      if (term.breakStart < minBreakStart) {
        showWarningModal(invalidDateMessage);
        return;
      }

      const duration = getDurationInDays(term.breakStart, term.breakEnd);
      if (duration <= 0) {
        showWarningModal("❌ Break end cannot be before break start");
        return;
      }

      if (duration > 21) {
        showWarningModal("⚠️ Break cannot be more than 3 weeks");
        return;
      }
    }

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const handleTermDurationDate = (y, t, field, value) => {
    if (t !== 3) {
      return;
    }

    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    if (!value) {
      const updated = cloneYearsData(yearsData);
      const term = updated[y].terms[t];
      term.termDurationMode = "auto";
      term.termStart = term.selfEnd ? toIso(getNextMonday(new Date(term.selfEnd))) : "";
      regenerateTimeline(updated);
      setYearsData(updated);
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    const updated = cloneYearsData(yearsData);
    const term = updated[y].terms[t];

    const minFourthTermStart = term.selfEnd ? toIso(getNextMonday(new Date(term.selfEnd))) : "";

    if (field === "termStart") {
      if (!isMonday(value)) {
        showWarningModal("❌ Term 4 must start on Monday");
        return;
      }

      if (minFourthTermStart && value < minFourthTermStart) {
        showWarningModal(invalidDateMessage);
        return;
      }
    }

    if (field === "termEnd" && !isSunday(value)) {
      showWarningModal("❌ Term 4 must end on Sunday");
      return;
    }

    term.termDurationMode = "manual";
    term[field] = value;

    if (term.termStart && term.termEnd) {
      const duration = getDurationInDays(term.termStart, term.termEnd);

      if (duration <= 0) {
        showWarningModal("❌ Term end cannot be before term start");
        return;
      }

      if (duration > 70) {
        showWarningModal("⚠️ Term 4 duration cannot be more than 10 weeks");
        return;
      }
    }

    regenerateTimeline(updated);
    setYearsData(updated);
  };

  const validateBreakRules = () => {
    if (!yearsData[0]?.terms?.[0]?.selfStart) {
      showWarningModal("Set Year 1 Term 1 self registration first");
      return false;
    }

    for (let y = 0; y < yearsData.length; y += 1) {
      for (let t = 0; t < 4; t += 1) {
        const current = yearsData[y]?.terms?.[t];
        if (!current) continue;

        const requiresAssessmentWeek = t !== 3;
        if (!current.selfStart || !current.selfEnd || !current.termStart || !current.termEnd
          || (requiresAssessmentWeek && (!current.assessmentStart || !current.assessmentEnd))) {
          showWarningModal(invalidDateMessage);
          return false;
        }

        if (current.termStart && current.selfEnd) {
          const expectedTermStart = toIso(getNextMonday(new Date(current.selfEnd)));
          const isFourthTerm = t === 3;

          if (!isFourthTerm && current.termStart !== expectedTermStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          if (isFourthTerm) {
            if (!isMonday(current.termStart) || !isSunday(current.termEnd)) {
              showWarningModal("❌ Term 4 duration must start on Monday and end on Sunday");
              return false;
            }

            if (current.termStart < expectedTermStart) {
              showWarningModal(invalidDateMessage);
              return false;
            }

            const termDuration = getDurationInDays(current.termStart, current.termEnd);
            if (termDuration <= 0 || termDuration > 70) {
              showWarningModal("❌ Term 4 duration must be between 1 day and 10 weeks");
              return false;
            }
          }
        }

        const activities = getActivities(current);
        for (let a = 0; a < activities.length; a += 1) {
          const activityStart = activities[a]?.start;
          if (!activityStart) continue;

          if (!current.termStart || activityStart < current.termStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          if (current.assessmentStart && activityStart >= current.assessmentStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          for (let compareIndex = a + 1; compareIndex < activities.length; compareIndex += 1) {
            const otherStart = activities[compareIndex]?.start;
            const otherEnd = activities[compareIndex]?.end;
            if (!otherStart || !otherEnd) continue;

            if (isWeekOverlap(activityStart, getWeekEndFromStart(activityStart), otherStart, otherEnd)) {
              showWarningModal(invalidDateMessage);
              return false;
            }
          }
        }

        const holidays = current.holidays || [];
        for (let h = 0; h < holidays.length; h += 1) {
          const holidayStart = holidays[h]?.start;
          if (!holidayStart) continue;

          if (!current.termStart || holidayStart < current.termStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          if (current.assessmentStart && holidayStart >= current.assessmentStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          for (let a = 0; a < activities.length; a += 1) {
            const activityStart = activities[a]?.start;
            const activityEnd = activities[a]?.end;
            if (!activityStart || !activityEnd) continue;

            if (isWeekOverlap(holidayStart, getWeekEndFromStart(holidayStart), activityStart, activityEnd)) {
              showWarningModal(invalidDateMessage);
              return false;
            }
          }
        }

        if (isLastTerm(y, t)) {
          continue;
        }

        if (isNoBreakTerm(t)) {
          if (current.breakStart || current.breakEnd || current.breakMode !== "none") {
            showWarningModal(`Year ${y + 1} Term 3 must not have break`);
            return false;
          }
        }

        if ((current.breakStart || current.breakEnd) && (!current.breakStart || !current.breakEnd)) {
          showWarningModal(invalidDateMessage);
          return false;
        }

        if (current.breakMode !== "none") {
          if (!current.breakStart || !current.breakEnd) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          const breakReferenceEndDate = getBreakReferenceEndDate(current, t);
          const minBreakStart = toIso(getNextMonday(new Date(breakReferenceEndDate)));
          if (
            current.breakStart < minBreakStart ||
            !isMonday(current.breakStart) ||
            !isSunday(current.breakEnd)
          ) {
            showWarningModal(invalidDateMessage);
            return false;
          }

          const duration = getDurationInDays(current.breakStart, current.breakEnd);
          if (duration <= 0 || duration > 21) {
            showWarningModal(invalidDateMessage);
            return false;
          }
        }

        const nextRef = getNextTermRef(y, t);
        if (!nextRef) continue;

        const nextTerm = yearsData[nextRef.yearIndex]?.terms?.[nextRef.termIndex];
        if (!nextTerm?.selfStart) {
          showWarningModal(invalidDateMessage);
          return false;
        }

        const expectedNextSelfStart = getExpectedNextSelfStart(current, t);

        if (nextTerm.selfStart !== expectedNextSelfStart) {
          showWarningModal(invalidDateMessage);
          return false;
        }
      }
    }

    return true;
  };

  // 💾 SAVE WITH BATCH
  const handleSave = async () => {
    if (!batchStart || !batchEnd) {
      showWarningModal("Enter Batch Start and End ❌");
      return;
    }

    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      showWarningModal("Batch values must be numbers ❌");
      return;
    }

  
    if (parsedBatchEnd < parsedBatchStart) {
      showWarningModal("Batch End cannot be less than Batch Start ❌");
      return;
    }

    if (!validateBreakRules()) {
      return;
    }

    try {
      const normalizedYearsData = getNormalizedYearsDataForSubmit(yearsData);
      const response = await axios.post("http://localhost:5000/api/almanac", {
        program,
        year,
        batchStart: parsedBatchStart,
        batchEnd: parsedBatchEnd,
        yearsData: normalizedYearsData
      });

      showWarningModal(`${response.data.message} ✅`);
    } catch (error) {
      console.error(error);
      const backendMessage = error?.response?.data?.message;
      showWarningModal(backendMessage ? `Save Failed ❌\n${backendMessage}` : "Save Failed ❌");
    }
  };

  const handleUpdate = async () => {
    if (!existingAlmanacId) {
      showWarningModal("No existing almanac found for selected batch to update ❌");
      return;
    }

    if (!batchStart || !batchEnd) {
      showWarningModal("Enter Batch Start and End ❌");
      return;
    }

    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      showWarningModal("Batch values must be numbers ❌");
      return;
    }

    if (parsedBatchEnd < parsedBatchStart) {
      showWarningModal("Batch End cannot be less than Batch Start ❌");
      return;
    }

    if (!validateBreakRules()) {
      return;
    }

    try {
      const normalizedYearsData = getNormalizedYearsDataForSubmit(yearsData);
      const response = await axios.put(`http://localhost:5000/api/almanac/${existingAlmanacId}`, {
        program,
        year,
        batchStart: parsedBatchStart,
        batchEnd: parsedBatchEnd,
        yearsData: normalizedYearsData
      });

      showWarningModal(response?.data?.message || "Almanac is updated successfully");
    } catch (error) {
      console.error(error);
      const backendMessage = error?.response?.data?.message;
      showWarningModal(backendMessage ? `Update Failed ❌\n${backendMessage}` : "Update Failed ❌");
    }
  };

  const toDisplayDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const yearValue = date.getFullYear();
    return `${day}.${month}.${yearValue}`;
  };

  const toRange = (start, end) => {
    if (!start || !end) return "-";
    return `${toDisplayDate(start)} to ${toDisplayDate(end)}`;
  };

  const getHolidayRange = (holidays) => {
    const ranges = (holidays || [])
      .filter((item) => item.start && item.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  const getActivityRange = (term) => {
    const ranges = getActivities(term)
      .filter((item) => item.start && item.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  const romanTerms = ["I", "II", "III", "IV"];

  if (!year) {
    return <h2 style={{ textAlign: "center" }}>No Year Selected ❌</h2>;
  }

  return (
    <>
    {showWarning && (
      <WarningModal
        message={warningMessage}
        onClose={() => setShowWarning(false)}
      />
    )}
    <div className="almanacContainer">

      {/* 🔥 HEADER */}
      <div className="headerRow">
        <Link to="/" className="backLink">Back to Home</Link>
        <h2 className="pageTitle">{program} Almanac</h2>
      </div>

      {/* 🔥 BATCH INPUT */}
      <div className="batchControls">
        <input
          type="number"
          placeholder="Batch Start (e.g. 2023)"
          value={batchStart}
          onChange={handleBatchStartChange}
        />

        <input
          type="number"
          placeholder="Batch End (Auto-calculated)"
          value={batchEnd}
          readOnly
          disabled
          style={{ opacity: 0.7 }}
        />
      </div>

      {/* 🔥 TABLE */}
      {yearsData.map((yearItem, yIndex) => (
        <section className="yearSection" key={yIndex}>
          <h3 className="yearTitle">{yearNames[yIndex]} Year</h3>

          <div className="tableWrap">
            <table className="almanacTable">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Self Registration (Start / End)</th>
                  <th>Term Duration (Commencement / Completion)</th>
                  <th>Student Activities</th>
                  <th>Festival Holidays</th>
                  <th>Assessment</th>
                  <th>Break</th>
                </tr>
              </thead>

              <tbody>
                {yearItem.terms.map((t, tIndex) => (
                  <tr key={tIndex}>
                    <td className="termLabel">Term {t.termNumber}</td>

                    <td>
                      <input type="date"
                        value={t.selfStart}
                        readOnly={!(yIndex === 0 && tIndex === 0)}
                        onChange={(e)=>handleSelfStart(yIndex,tIndex,e.target.value)}
                      />
                      <input type="date" value={t.selfEnd} readOnly />
                    </td>

                    <td>
                      {tIndex === 3 ? (
                        <>
                          <input
                            type="date"
                            value={t.termStart}
                            onChange={(e) => handleTermDurationDate(yIndex, tIndex, "termStart", e.target.value)}
                            title="Select Term 4 start date"
                          />
                          <input
                            type="date"
                            value={t.termEnd}
                            onChange={(e) => handleTermDurationDate(yIndex, tIndex, "termEnd", e.target.value)}
                            title="Select Term 4 end date"
                          />
                        </>
                      ) : (
                        <>
                          <input type="date" value={t.termStart} readOnly />
                          <input type="date" value={t.termEnd} readOnly />
                        </>
                      )}
                    </td>

                    <td>
                      {getActivities(t).map((activity, activityIndex) => (
                        <div className="holidayRow" key={activityIndex}>
                          <input
                            type="date"
                            value={activity.start}
                            onChange={(e) => handleActivity(yIndex, tIndex, activityIndex, e.target.value)}
                          />
                          <input type="date" value={activity.end} readOnly />
                          <button
                            type="button"
                            className="addHolidayLink"
                            aria-label="Delete activity"
                            onClick={() => removeActivity(yIndex, tIndex, activityIndex)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="addHolidayLink"
                        aria-label="Add activity"
                        onClick={() => addActivity(yIndex, tIndex)}
                      >
                        +
                      </button>
                    </td>

                    <td>
                      {t.holidays.map((h, hi) => (
                        <div className="holidayRow" key={hi}>
                          <input type="date"
                            value={h.start}
                            onChange={(e)=>handleHoliday(yIndex,tIndex,hi,e.target.value)}
                          />
                          <input type="date" value={h.end} readOnly />
                          <button
                            type="button"
                            className="addHolidayLink"
                            aria-label="Delete holiday"
                            onClick={() => removeHoliday(yIndex, tIndex, hi)}
                          >
                            x
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="addHolidayLink"
                        aria-label="Add holiday"
                        onClick={() => addHoliday(yIndex, tIndex)}
                      >
                        +
                      </button>
                    </td>

                    <td>
                      {tIndex === 3 ? (
                        <span className="noBreakText" title="No assessment week">-</span>
                      ) : (
                        <>
                          <input type="date" value={t.assessmentStart} readOnly />
                          <input type="date" value={t.assessmentEnd} readOnly />
                        </>
                      )}
                    </td>

                    <td>
                      {isNoBreakTerm(tIndex) ? (
                        <span className="noBreakText" title="No break">—</span>
                      ) : isLastTerm(yIndex, tIndex) ? (
                        <span className="noBreakText" title="No next term break">—</span>
                      ) : (
                        <>
                          <input
                            type="date"
                            value={t.breakStart}
                            onChange={(e) => handleBreakDate(yIndex, tIndex, "breakStart", e.target.value)}
                          />
                          <input
                            type="date"
                            value={t.breakEnd}
                            onChange={(e) => handleBreakDate(yIndex, tIndex, "breakEnd", e.target.value)}
                          />
                          {t.breakMode === "none" ? (
                            <button
                              type="button"
                              className="addHolidayLink"
                              onClick={() => handleBreakModeChange(yIndex, tIndex, "auto")}
                              title="Auto Break"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="addHolidayLink"
                              onClick={() => handleBreakModeChange(yIndex, tIndex, "none")}
                              title="Remove Break"
                            >
                              −
                            </button>
                          )}
                          {t.breakMode === "manual" && (
                            <button
                              type="button"
                              className="addHolidayLink"
                              onClick={() => handleBreakModeChange(yIndex, tIndex, "auto")}
                              title="Use Auto"
                            >
                              ⚙
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="actionRow">
        <button className="previewBtn" onClick={() => setShowPreview(true)}>
          Preview Design
        </button>

        <button
          className="saveBtn"
          onClick={handleUpdate}
          disabled={!existingAlmanacId || isLoadingExisting}
          title={!existingAlmanacId ? "Select an existing batch to update" : "Update selected almanac"}
        >
          {isLoadingExisting ? "Checking..." : "Update Almanac"}
        </button>

        <button className="saveBtn" onClick={handleSave}>
          Save Almanac
        </button>
      </div>

      {showPreview && (
        <div className="previewOverlay" onClick={() => setShowPreview(false)}>
          <div className="previewCard" onClick={(e) => e.stopPropagation()}>
            <div className="previewTopBar">
              <h3>Almanac Preview</h3>
              <button className="previewCloseBtn" onClick={() => setShowPreview(false)}>
                Close
              </button>
            </div>

            <div className="previewPaper">
              <div className="previewHeaderBar">
                <div className="previewHeaderLeft">
                  <img src="/text.jpeg" alt="Aurora University text" className="previewTextLogo" />
                </div>

                <img src="/Aurora Logo.png" alt="Aurora emblem" className="previewTopLogo previewTopLogoRight" />
              </div>

              <div className="previewTableWrap">
                <table className="previewTable">
                  <thead>
                    <tr>
                      <th rowSpan="2">Year</th>
                      <th rowSpan="2">Term</th>
                      <th colSpan="2">Self Registration</th>
                      <th colSpan="2">Term Duration</th>
                      <th rowSpan="2">Student Led Activities</th>
                      <th rowSpan="2">Festival Holidays</th>
                      <th rowSpan="2">Comprehensive Assessment</th>
                      <th rowSpan="2">Break</th>
                    </tr>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                      <th>Commencement</th>
                      <th>Completion</th>
                    </tr>
                  </thead>

                  <tbody>
                    {yearsData.map((yearItem, yIndex) => (
                      yearItem.terms.map((term, tIndex) => (
                        <tr className={`yearBand yearBand${yIndex}`} key={`${yIndex}-${tIndex}`}>
                          {tIndex === 0 && (
                            <td className="previewYearCell" rowSpan={yearItem.terms.length}>
                              {yearNames[yIndex] || `Year ${yIndex + 1}`}
                            </td>
                          )}

                          <td>{romanTerms[tIndex] || term.termNumber}</td>
                          <td>{toDisplayDate(term.selfStart)}</td>
                          <td>{toDisplayDate(term.selfEnd)}</td>
                          <td>{toDisplayDate(term.termStart)}</td>
                          <td>{toDisplayDate(term.termEnd)}</td>
                          <td>{getActivityRange(term)}</td>
                          <td>{getHolidayRange(term.holidays)}</td>
                          <td>{getAssessmentDisplayValue(term, tIndex)}</td>
                          <td>{getPreviewBreakValue(term, yIndex, tIndex)}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="previewSignoffRow">
                <div className="previewSignoffLabel">Dean</div>
                <div className="previewSignoffLabel">Director Academics and Planning</div>
              </div>

              <div className="previewFooterBar">Uppal, Hyderabad - 500098. Telangana, aurora.edu.in</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default AlmanacForm;