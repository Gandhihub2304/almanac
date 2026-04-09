import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import "./AcademicCalendarPage.css";
import AcademicCalendarTemplate from "./AcademicCalendarTemplate";
import { buildAcademicCalendarTemplateModel } from "../utils/academicCalendarTemplate";
import { getYearLabels } from "../utils/yearLabels";

const normalize = (value) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();

const monthLookup = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

const toIsoDate = (yearValue, monthValue, dayValue) => {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return "";
  if (year < 100) return "";
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return "";
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const normalizeInlineText = (value) => (value || "").replace(/\s+/g, " ").trim();

const formatDateAsIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const uniqueList = (values) => Array.from(new Set(values.filter(Boolean)));

const selectIsoCandidate = (candidates, allowedDatesSet) => {
  const uniqueCandidates = uniqueList(candidates);
  if (!uniqueCandidates.length) return "";

  if (allowedDatesSet?.size) {
    const matching = uniqueCandidates.filter((item) => allowedDatesSet.has(item));
    if (matching.length === 1) return matching[0];
    if (matching.length > 1) return "";
  }

  if (uniqueCandidates.length > 1) return "";
  return uniqueCandidates[0];
};

const parseNumericDate = (dateText, allowedDatesSet) => {
  const value = (dateText || "").trim();
  const match = value.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
  if (!match) return "";

  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);

  if (match[1].length === 4) {
    return toIsoDate(a, b, c);
  }

  const year = match[3].length === 2 ? 2000 + c : c;
  const dayFirst = toIsoDate(year, b, a);
  const monthFirst = toIsoDate(year, a, b);
  return selectIsoCandidate([dayFirst, monthFirst], allowedDatesSet);
};

const parseTextDate = (dateText) => {
  const normalized = normalizeInlineText(dateText).replace(",", "");
  if (!normalized) return "";

  const dayMonthYear = normalized.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = monthLookup[dayMonthYear[2].toLowerCase()];
    const yearRaw = Number(dayMonthYear[3]);
    const year = dayMonthYear[3].length === 2 ? 2000 + yearRaw : yearRaw;
    return toIsoDate(year, month, day);
  }

  const monthDayYear = normalized.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{2,4})$/);
  if (monthDayYear) {
    const month = monthLookup[monthDayYear[1].toLowerCase()];
    const day = Number(monthDayYear[2]);
    const yearRaw = Number(monthDayYear[3]);
    const year = monthDayYear[3].length === 2 ? 2000 + yearRaw : yearRaw;
    return toIsoDate(year, month, day);
  }

  return "";
};

const parseDateToken = (dateValue, allowedDatesSet) => {
  if (dateValue instanceof Date) {
    return formatDateAsIso(dateValue);
  }

  if (typeof dateValue === "number" && Number.isFinite(dateValue)) {
    const parsed = XLSX.SSF.parse_date_code(dateValue);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return toIsoDate(parsed.y, parsed.m, parsed.d);
    }
  }

  const dateText = normalizeInlineText(String(dateValue || ""));
  if (!dateText) return "";

  return parseNumericDate(dateText, allowedDatesSet)
    || parseTextDate(dateText);
};

const extractDateActivityColumnsFromSheetRows = (rows, allowedDatesSet, textRows = null) => {
  if (!Array.isArray(rows) || !rows.length) return [];

  const headerRow = rows[0] || [];
  let dateColumn = -1;
  let compensatoryColumn = -1;
  let holidaysColumn = -1;
  let eventsColumn = -1;

  for (let index = 0; index < headerRow.length; index += 1) {
    const headerText = normalizeInlineText(String(headerRow[index] || "")).toLowerCase();
    if (dateColumn < 0 && headerText === "date") {
      dateColumn = index;
    }
    if (compensatoryColumn < 0 && /compensatory\s*working\s*day|compensatory/.test(headerText)) {
      compensatoryColumn = index;
    }
    if (holidaysColumn < 0 && /holidays?|holiday/i.test(headerText)) {
      holidaysColumn = index;
    }
    if (eventsColumn < 0 && /events?|event/i.test(headerText)) {
      eventsColumn = index;
    }
  }

  const hasHeader = dateColumn >= 0;
  const startRow = hasHeader ? 1 : 0;

  if (dateColumn < 0) {
    dateColumn = 0;
  }
  if (compensatoryColumn < 0) {
    compensatoryColumn = 1;
  }
  if (holidaysColumn < 0) {
    holidaysColumn = 2;
  }
  if (eventsColumn < 0) {
    eventsColumn = 3;
  }

  const pairs = [];
  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const dateValue = row[dateColumn];
    const textRow = Array.isArray(textRows) ? (textRows[rowIndex] || []) : null;
    const displayDateValue = textRow ? textRow[dateColumn] : "";
    const compensatory = normalizeInlineText(String(row[compensatoryColumn] || ""));
    const holidays = normalizeInlineText(String(row[holidaysColumn] || ""));
    const events = normalizeInlineText(String(row[eventsColumn] || ""));

    if (dateValue === undefined || dateValue === null) continue;

    // If Excel gives a JS Date object, parse from displayed text to avoid timezone day shift.
    const sourceDateValue = dateValue instanceof Date && displayDateValue ? displayDateValue : dateValue;
    const isoDate = parseDateToken(sourceDateValue, allowedDatesSet);
    if (!isoDate) continue;
    pairs.push({
      date: isoDate,
      compensatoryWorkingDay: compensatory,
      holidays,
      events
    });
  }

  return pairs;
};

const extractDateActivityColumnsFromCsv = (text, allowedDatesSet) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const rows = lines.map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  });

  return extractDateActivityColumnsFromSheetRows(rows, allowedDatesSet);
};

const extractDateActivityColumnsFromExcel = async (arrayBuffer, allowedDatesSet) => {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: ""
  });

  const textRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: ""
  });

  return extractDateActivityColumnsFromSheetRows(rows, allowedDatesSet, textRows);
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];

  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return [];
  }

  const dates = [];
  const current = new Date(from);
  while (current <= to) {
    dates.push(formatDateAsIso(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const getDayDiff = (fromIso, toIsoDate) => {
  const from = new Date(fromIso);
  const to = new Date(toIsoDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
};

const getDayLabel = (isoDate) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { weekday: "long" });
};

const toSafeText = (value) => String(value || "").trim();

const deriveCalendarColumns = (row = {}) => {
  const weekLabel = toSafeText(row.weekLabel);
  const remarks = toSafeText(row.remarks);
  const existingBreakColumn = toSafeText(row.breakColumn);
  const combined = `${weekLabel} ${remarks} ${existingBreakColumn}`.toLowerCase();

  const isCompensatoryWorkingDay = /compensatory\s*working\s*day|compensatory/.test(combined);
  const isAssessmentWeek = /comprehensive\s*assessment|assessment\s*week|assessment|exam|test/.test(combined);
  const isHoliday = /holiday|festival|jayanti/.test(combined);
  const isStudentLedActivities = /student\s*led\s*activities?|student\s*activity/.test(combined)
    || /student\s*led\s*activities?|student\s*activity/.test(toSafeText(row.events).toLowerCase())
    || /student\s*led\s*activities?|student\s*activity/.test(toSafeText(row.studentLedActivities).toLowerCase());
  const isEvent = /event/.test(combined) && !isStudentLedActivities;
  const isSelfRegistration = /self\s*registration/.test(combined);
  const isBreak = /term\s*break|\bbreak\b/.test(combined);
  const isResultsDay = Boolean(row.isResultsDay) || /results?\s*day/.test(combined);
  const isTermBegin = Boolean(row.isTermBegin) || /term\s*begins?/.test(combined);
  const isTermEnd = Boolean(row.isTermEnd) || /term\s*ends?/.test(combined);

  const legacyHolidayEvent = toSafeText(row.holidaysAndEvents);

  return {
    studentLedActivities: toSafeText(row.studentLedActivities) || (isStudentLedActivities ? "Student Led Activities" : ""),
    compensatoryWorkingDay: toSafeText(row.compensatoryWorkingDay) || (isCompensatoryWorkingDay ? "Compensatory Working Day" : ""),
    assessmentWeek: toSafeText(row.assessmentWeek) || (isAssessmentWeek ? "Comprehensive Assessment" : ""),
    holidays: toSafeText(row.holidays) || (legacyHolidayEvent && /holiday/i.test(legacyHolidayEvent) ? legacyHolidayEvent : (isHoliday ? "Holiday" : "")),
    events: toSafeText(row.events)
      || (legacyHolidayEvent && /event/i.test(legacyHolidayEvent) ? legacyHolidayEvent : (isEvent ? "Event" : "")),
    selfRegistration: toSafeText(row.selfRegistration) || (isSelfRegistration ? "Self Registration" : ""),
    breakColumn: existingBreakColumn || (isResultsDay ? "Results Day" : (isBreak ? "Term Break" : "")),
    isResultsDay,
    isTermBegin,
    isTermEnd
  };
};

const buildRemarksFromColumns = (row = {}) => {
  const values = [
    toSafeText(row.studentLedActivities),
    toSafeText(row.compensatoryWorkingDay),
    toSafeText(row.assessmentWeek),
    toSafeText(row.holidays),
    toSafeText(row.events),
    toSafeText(row.selfRegistration),
    toSafeText(row.breakColumn)
  ].filter(Boolean);

  return values.length ? values.join(" and ") : "";
};

const buildRowsFromTerms = (terms) => {
  const romanTerms = ["I", "II", "III", "IV"];

  return (terms || []).flatMap((term, termIndex) => {
    const dayMap = new Map();

    const addRange = (start, end, phase, priority) => {
      getDateRange(start, end).forEach((dateValue) => {
        const existing = dayMap.get(dateValue) || { labels: [], priority: -1 };

        if (!existing.labels.includes(phase)) {
          existing.labels.push(phase);
        }

        if (priority >= existing.priority) {
          existing.primaryLabel = phase;
          existing.priority = priority;
        }

        dayMap.set(dateValue, existing);
      });
    };

    addRange(term.termStart, term.termEnd, "Term Work", 1);
    addRange(term.selfStart, term.selfEnd, "Self Registration", 2);
    addRange(term.breakStart, term.breakEnd, "Break", 3);
    addRange(term.assessmentStart, term.assessmentEnd, "Comprehensive Assessment", 3);

    (term.activities || [])
      .filter((item) => item.start && item.end)
      .forEach((item) => {
        addRange(item.start, item.end, "Student Led Activities", 4);
      });

    (term.holidays || [])
      .filter((item) => item.start && item.end)
      .forEach((item) => {
        addRange(item.start, item.end, "Holiday", 5);
      });

    const termLabel = romanTerms[termIndex] || String(termIndex + 1);

      return Array.from(dayMap.keys())
      .sort()
      .map((dateValue) => {
          const rowInfo = dayMap.get(dateValue) || { labels: [] };
          const labels = rowInfo.labels || [];
          const visibleLabels = labels.filter((label) => label && label.trim() && label.trim() !== "-" && label !== "Term Work");
          const remarks = visibleLabels.length ? visibleLabels.join(" and ") : "";
          const isSelfRegistration = labels.includes("Self Registration");
          const isBreak = labels.includes("Break");
          const isAssessment = labels.includes("Comprehensive Assessment");
          const isHoliday = labels.includes("Holiday");
          const isStudentActivity = labels.includes("Student Led Activities");
          const isCompensatoryWorkingDay = labels.some((label) => /compensatory working day/i.test(label));
          const isResultsDay = Boolean(term.breakStart) && getDayDiff(term.breakStart, dateValue) === 2;

        let weekLabel = "";
        if (isSelfRegistration) {
          weekLabel = "Self Registration";
        } else if (isResultsDay) {
          weekLabel = "Results Day";
        } else if (isBreak) {
          weekLabel = "Break";
          } else if (isAssessment) {
            weekLabel = "Comprehensive Assessment";
          } else if (isHoliday) {
            weekLabel = "Holiday";
          } else if (isStudentActivity) {
            weekLabel = "Student Led Activities";
        } else if (term.termStart) {
          const diff = getDayDiff(term.termStart, dateValue);
          const weekNo = Math.floor(Math.max(diff, 0) / 7) + 1;
          weekLabel = `Week ${weekNo}`;
        }

        return {
          termLabel,
          date: dateValue,
          day: getDayLabel(dateValue),
          weekLabel,
          remarks,
          studentLedActivities: isStudentActivity ? "Student Led Activities" : "",
          compensatoryWorkingDay: isCompensatoryWorkingDay ? "Compensatory Working Day" : "",
          assessmentWeek: isAssessment ? "Comprehensive Assessment" : "",
          holidays: isHoliday ? "Holiday" : "",
          events: "",
          selfRegistration: isSelfRegistration ? "Self Registration" : "",
          breakColumn: isResultsDay ? "Results Day" : (isBreak ? "Term Break" : ""),
          isResultsDay,
          isTermBegin: dateValue === term.termStart,
          isTermEnd: dateValue === term.termEnd
        };
      });
  });
};

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());

function AcademicCalendarTablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { almanacId, yearNumber } = useParams();
  const readOnlyView = Boolean(location.state?.readOnly);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewData, setViewData] = useState(null);
  const [editableRows, setEditableRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: "", message: "" });
  const [pdfImportStatus, setPdfImportStatus] = useState({ type: "", message: "" });
  const pdfInputRef = useRef(null);

  const getAcademicYearHeading = (yearValue, totalYears) => {
    const labels = getYearLabels(totalYears);
    return labels[Number(yearValue) - 1] || `Year ${yearValue}`;
  };

  const getResolvedTotalYears = (totalYears, batchStart, batchEnd) => {
    const parsedTotal = Number(totalYears);
    if (Number.isInteger(parsedTotal) && parsedTotal > 0) {
      return parsedTotal;
    }

    const start = Number(batchStart);
    const end = Number(batchEnd);
    if (Number.isInteger(start) && Number.isInteger(end) && end > start) {
      return end - start;
    }

    return 0;
  };

  const getYearBatchRange = (batchStart, yearValue, batchEnd) => {
    const start = Number(batchStart);
    const selectedYear = Number(yearValue);

    if (Number.isInteger(start) && Number.isInteger(selectedYear) && selectedYear > 0) {
      const yearStart = start + (selectedYear - 1);
      const yearEnd = yearStart + 1;
      return `${yearStart} - ${yearEnd}`;
    }

    return `${batchStart} - ${batchEnd}`;
  };

  const getFormalHeadingLines = () => {
    if (!viewData) return [];

    const yearRange = getYearBatchRange(viewData.batchStart, viewData.yearNumber, viewData.batchEnd);

    return [
      String(viewData.schoolName || "School").toUpperCase(),
      `${viewData.programName} ${yearRange}`,
      `Academic Calendar - ${viewData.yearHeading}`
    ];
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

  useEffect(() => {
    const savedCalendarFromState = location.state?.savedCalendarData;

    if (savedCalendarFromState && Array.isArray(savedCalendarFromState.rows)) {
      const selectedYearNumber = Number(yearNumber);
      const totalYears = getResolvedTotalYears(
        savedCalendarFromState.totalYears,
        savedCalendarFromState.batchStart,
        savedCalendarFromState.batchEnd
      );

      setViewData({
        schoolName: savedCalendarFromState.schoolName || location.state?.schoolName || "School",
        programName: savedCalendarFromState.program || location.state?.programName || "",
        batchStart: savedCalendarFromState.batchStart,
        batchEnd: savedCalendarFromState.batchEnd,
        yearNumber: selectedYearNumber,
        totalYears,
        yearHeading: getAcademicYearHeading(selectedYearNumber, totalYears),
        terms: []
      });

      const normalizedRows = savedCalendarFromState.rows.map((row) => ({
        termLabel: row.termLabel || "-",
        date: row.date || "",
        day: row.day || "-",
        weekLabel: row.weekLabel || "-",
        remarks: (row.remarks && row.remarks !== "-") ? row.remarks : "",
        ...deriveCalendarColumns(row)
      }));

      setEditableRows(normalizedRows);
      setError("");
      setLoading(false);
      return;
    }

    const fetchCalendar = async () => {
      try {
        const selectedYearNumber = Number(yearNumber);
        const [almanacRes, schoolsRes, savedCalendarRes] = await Promise.allSettled([
          axios.get(`http://localhost:5000/api/almanac/${almanacId}`),
          axios.get("http://localhost:5000/api/schools"),
          axios.get(`http://localhost:5000/api/almanac/${almanacId}/year/${selectedYearNumber}/day-wise-table`)
        ]);

        const schools = schoolsRes.status === "fulfilled" ? (schoolsRes.value.data || []) : [];
        const savedCalendar = savedCalendarRes.status === "fulfilled" ? savedCalendarRes.value.data : null;
        const almanac = almanacRes.status === "fulfilled" ? almanacRes.value.data : null;

        const yearData = almanac?.yearsData?.[selectedYearNumber - 1];

        if (!savedCalendar && !yearData) {
          setError("Selected year data not found.");
          setLoading(false);
          return;
        }

        const schoolFromState = location.state?.schoolName || savedCalendar?.schoolName || "";
        const programFromState = location.state?.programName || savedCalendar?.program || almanac?.program || "";

        let detectedSchool = schoolFromState;
        if (!detectedSchool) {
          const matchedSchool = schools.find((item) =>
            (item.programs || []).some((program) => normalize(program) === normalize(programFromState))
          );
          detectedSchool = matchedSchool?.name || "School";
        }

        const resolvedTotalYears = getResolvedTotalYears(
          savedCalendar?.totalYears || almanac?.year || 0,
          savedCalendar?.batchStart || almanac?.batchStart,
          savedCalendar?.batchEnd || almanac?.batchEnd
        );

        setViewData({
          schoolName: detectedSchool,
          programName: programFromState,
          batchStart: savedCalendar?.batchStart || almanac?.batchStart,
          batchEnd: savedCalendar?.batchEnd || almanac?.batchEnd,
          yearNumber: selectedYearNumber,
          totalYears: resolvedTotalYears,
          yearHeading: getAcademicYearHeading(selectedYearNumber, resolvedTotalYears),
          terms: yearData?.terms || []
        });

        const generatedRows = buildRowsFromTerms(yearData?.terms || []);
        const savedRows = Array.isArray(savedCalendar?.rows) ? savedCalendar.rows : [];
        const savedMap = new Map(
          savedRows.map((item) => [`${item.termLabel}::${item.date}`, item])
        );

        const mergedRows = generatedRows.map((row) => {
          const matched = savedMap.get(`${row.termLabel}::${row.date}`);
          if (!matched) return row;

          const mergedColumnValues = deriveCalendarColumns({
            ...row,
            ...matched,
            remarks: (matched.remarks && matched.remarks !== "-")
              ? matched.remarks
              : (row.remarks && row.remarks !== "-" ? row.remarks : "")
          });

          return {
            ...row,
            weekLabel: matched.weekLabel || row.weekLabel,
            remarks: (matched.remarks && matched.remarks !== "-")
              ? matched.remarks
              : (row.remarks && row.remarks !== "-" ? row.remarks : ""),
            isTermBegin: Boolean(matched.isTermBegin) || Boolean(row.isTermBegin),
            isTermEnd: Boolean(matched.isTermEnd) || Boolean(row.isTermEnd),
            ...mergedColumnValues
          };
        });

        setEditableRows(savedRows.length ? mergedRows : generatedRows);
      } catch (fetchError) {
        console.error("Failed to load academic calendar table:", fetchError);
        setError("Unable to load academic calendar details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [almanacId, yearNumber, location.state]);

  const renderRows = useMemo(() => {
    if (!editableRows.length) return [];

    return editableRows.map((row, index) => {
      const previous = editableRows[index - 1];
      const nextRowsForTerm = editableRows.slice(index).filter((item) => item.termLabel === row.termLabel);

      const showTerm = !previous || previous.termLabel !== row.termLabel;
      const termRowSpan = showTerm ? nextRowsForTerm.length : 0;

      const showWeek = !previous
        || previous.termLabel !== row.termLabel
        || previous.weekLabel !== row.weekLabel;

      let weekRowSpan = 0;
      if (showWeek) {
        weekRowSpan = 1;
        for (let cursor = index + 1; cursor < editableRows.length; cursor += 1) {
          if (editableRows[cursor].termLabel !== row.termLabel) break;
          if (editableRows[cursor].weekLabel !== row.weekLabel) break;
          weekRowSpan += 1;
        }
      }

      return {
        ...row,
        rowIndex: index,
        showTerm,
        termRowSpan,
        showWeek,
        weekRowSpan
      };
    });
  }, [editableRows]);

  const templateModel = useMemo(
    () => buildAcademicCalendarTemplateModel({ rows: editableRows }),
    [editableRows]
  );

  const handleColumnChange = (rowIndex, field, value) => {
    setEditableRows((current) =>
      current.map((item, index) => (
        index === rowIndex
          ? {
            ...item,
            [field]: value,
            remarks: buildRemarksFromColumns({ ...item, [field]: value })
          }
          : item
      ))
    );
  };

  const handleWeekChange = (rowIndex, rowSpan, value) => {
    setEditableRows((current) =>
      current.map((item, index) => {
        if (index >= rowIndex && index < rowIndex + rowSpan) {
          return { ...item, weekLabel: value };
        }
        return item;
      })
    );
  };

  const saveTable = async () => {
    setSaving(true);
    setSaveStatus({ type: "", message: "" });

    try {
      let targetAlmanacId = isValidObjectId(almanacId) ? almanacId : "";

      if (!targetAlmanacId) {
        const stateAlmanacId = location.state?.savedCalendarData?.almanacId;
        if (isValidObjectId(stateAlmanacId)) {
          targetAlmanacId = stateAlmanacId;
        }
      }

      if (!targetAlmanacId && viewData?.programName && viewData?.batchStart && viewData?.batchEnd && viewData?.totalYears) {
        const batchesRes = await axios.get("http://localhost:5000/api/almanac/batches");
        const matchedBatch = (batchesRes.data || []).find((item) =>
          String(item.program || "").toLowerCase().trim() === String(viewData.programName || "").toLowerCase().trim()
          && Number(item.batchStart) === Number(viewData.batchStart)
          && Number(item.batchEnd) === Number(viewData.batchEnd)
          && Number(item.year) === Number(viewData.totalYears)
        );

        if (isValidObjectId(matchedBatch?._id)) {
          targetAlmanacId = matchedBatch._id;
        }
      }

      if (!targetAlmanacId) {
        setSaveStatus({
          type: "error",
          message: "Unable to save table: valid almanac record not found for this programme and batch."
        });
        setSaving(false);
        return;
      }

      const payload = {
        rows: editableRows.map((item) => ({
          termLabel: item.termLabel,
          weekLabel: item.weekLabel,
          date: item.date,
          day: item.day,
          remarks: buildRemarksFromColumns(item) || item.remarks,
          studentLedActivities: item.studentLedActivities,
          compensatoryWorkingDay: item.compensatoryWorkingDay,
          assessmentWeek: item.assessmentWeek,
          holidays: item.holidays,
          events: item.events,
          selfRegistration: item.selfRegistration,
          breakColumn: item.breakColumn,
          isTermBegin: item.isTermBegin,
          isTermEnd: item.isTermEnd,
          isResultsDay: item.isResultsDay
        })),
        schoolName: viewData.schoolName,
        program: viewData.programName,
        batchStart: viewData.batchStart,
        batchEnd: viewData.batchEnd,
        totalYears: viewData.totalYears,
        yearHeading: viewData.yearHeading
      };

      const endpoint = `http://localhost:5000/api/almanac/${targetAlmanacId}/year/${yearNumber}/day-wise-table`;
      let res;

      try {
        res = await axios.put(endpoint, payload);
      } catch (putError) {
        if (putError?.response?.status === 404 || putError?.response?.status === 405) {
          res = await axios.post(endpoint, payload);
        } else {
          throw putError;
        }
      }

      setSaveStatus({
        type: "success",
        message: res?.data?.message || "Table saved successfully"
      });
    } catch (saveError) {
      console.error("Failed to save day-wise table:", saveError);
      const backendMessage = saveError?.response?.data?.message;
      const statusText = saveError?.response?.status ? ` (HTTP ${saveError.response.status})` : "";
      setSaveStatus({
        type: "error",
        message: backendMessage
          ? `${backendMessage}${statusText}`
          : (saveError?.message ? `${saveError.message}${statusText}` : `Unable to save table${statusText}`)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadButtonClick = () => {
    if (pdfInputRef.current) {
      pdfInputRef.current.click();
    }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const fileName = (file.name || "").toLowerCase();
    const isCsv = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCsv && !isExcel) {
      setPdfImportStatus({ type: "error", message: "Please upload an Excel or CSV file only." });
      return;
    }

    if (!editableRows.length) {
      setPdfImportStatus({ type: "error", message: "No table rows available to update." });
      return;
    }

    setPdfImportStatus({ type: "", message: "Reading Excel/CSV and matching dates..." });

    try {
      let pairs = [];
      const tableDatesSet = new Set(editableRows.map((row) => row.date).filter(Boolean));

      if (isCsv) {
        const csvText = await file.text();
        pairs = extractDateActivityColumnsFromCsv(csvText, tableDatesSet);
      } else {
        const buffer = await file.arrayBuffer();
        pairs = await extractDateActivityColumnsFromExcel(buffer, tableDatesSet);
      }

      if (!pairs.length) {
        setPdfImportStatus({
          type: "error",
          message: "No dates found in the uploaded file."
        });
        return;
      }

      const latestActivityByDate = new Map();
      pairs.forEach((item) => {
        latestActivityByDate.set(item.date, {
          compensatoryWorkingDay: item.compensatoryWorkingDay,
          holidays: item.holidays,
          events: item.events
        });
      });

      const uploadedDates = Array.from(latestActivityByDate.keys());
      const matchedDates = uploadedDates.filter((dateValue) => tableDatesSet.has(dateValue));

      if (!matchedDates.length) {
        setPdfImportStatus({
          type: "error",
          message: "No dates found in the uploaded file."
        });
        return;
      }

      let updatedCount = 0;
      const nextRows = editableRows.map((row) => {
        const activityFromFile = latestActivityByDate.get(row.date);
        if (!activityFromFile) return row;
        
        const hasChanges =
          (activityFromFile.compensatoryWorkingDay && activityFromFile.compensatoryWorkingDay !== (row.compensatoryWorkingDay || "")) ||
          (activityFromFile.holidays && activityFromFile.holidays !== (row.holidays || "")) ||
          (activityFromFile.events && activityFromFile.events !== (row.events || ""));
        
        if (!hasChanges) return row;
        updatedCount += 1;
        const updated = {
          ...row,
          compensatoryWorkingDay: activityFromFile.compensatoryWorkingDay || row.compensatoryWorkingDay,
          holidays: activityFromFile.holidays || row.holidays,
          events: activityFromFile.events || row.events
        };
        return {
          ...updated,
          ...deriveCalendarColumns(updated)
        };
      });

      setEditableRows(nextRows);

      setPdfImportStatus({
        type: "success",
        message: "File uploaded successfully."
      });
    } catch (uploadError) {
      console.error("Excel/CSV import failed:", uploadError);
      setPdfImportStatus({
        type: "error",
        message: "Unable to read the file. Please check the format and try again."
      });
    }
  };

  if (loading) {
    return <h3 className="previewStatus">Loading academic calendar...</h3>;
  }

  if (error || !viewData) {
    return (
      <div className="viewPageShell">
        <h3 className="previewStatus">{error || "Academic calendar not found"}</h3>
        <button className="previewBtn" onClick={() => navigate("/academic-calendar")}>Back</button>
      </div>
    );
  }

  return (
    <section className="academicCalendarShell">
      <div className="academicCalendarHeader">
        <img src="/Aurora Logo.png" alt="Aurora Logo" className="academicCalendarLogo" />
        <h1 className="academicCalendarTitle">Aurora University Academic Calendar</h1>
        <p className="academicCalendarSubtitle">
          {readOnlyView
            ? "Read-only day-wise schedule"
            : "Editable day-wise schedule generated from saved almanac"}
        </p>
      </div>

      <main className="academicCalendarContent">
        <div className="calendarBackRow">
          <button type="button" className="calendarBackButton" onClick={() => navigate("/academic-calendar")}>Back</button>
        </div>

        <section className="dayWiseCalendarSection">
          {!readOnlyView && (
            <div className="formalCalendarHeading">
              {getFormalHeadingLines().map((line, index) => (
                <p key={`heading-line-${index}`}>{line}</p>
              ))}
            </div>
          )}

          {readOnlyView && (
            <AcademicCalendarTemplate
              headingLines={getFormalHeadingLines()}
              model={templateModel}
              schoolName={viewData.schoolName}
            />
          )}

          {!readOnlyView && (
            <div className="tableActionRow">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handlePdfUpload}
                style={{ display: "none" }}
              />
              <button type="button" className="calendarBackButton previewButton" onClick={() => setShowPreview(true)}>
                Preview Calendar
              </button>
              <button type="button" className="calendarBackButton saveButton" onClick={saveTable} disabled={saving || !editableRows.length}>
                {saving ? "Saving..." : "Save Table"}
              </button>
              <button type="button" className="calendarBackButton uploadPdfButton" onClick={handleUploadButtonClick}>
                Upload Excel/CSV
              </button>
            </div>
          )}

          {!readOnlyView && pdfImportStatus.message && (
            <p className={pdfImportStatus.type === "error" ? "calendarErrorText" : "calendarSuccessText"}>
              {pdfImportStatus.message}
            </p>
          )}

          {!readOnlyView && saveStatus.message && (
            <p className={saveStatus.type === "error" ? "calendarErrorText" : "calendarSuccessText"}>
              {saveStatus.message}
            </p>
          )}

          {!readOnlyView && (
            <div className="dayWiseTableWrap">
              <table className="dayWiseTable">
                <thead>
                  <tr>
                    <th>Term No</th>
                    <th>Week</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Student Led Activities</th>
                    <th>Compensatory Working Day</th>
                    <th>Assessment Week</th>
                    <th>Holidays</th>
                    <th>Events</th>
                    <th>Self Registration</th>
                    <th>Break</th>
                  </tr>
                </thead>
                <tbody>
                  {!renderRows.length ? (
                    <tr>
                      <td colSpan="11" className="dayWiseEmpty">No date rows available for selected year.</td>
                    </tr>
                  ) : (
                    renderRows.map((row) => (
                      <tr key={`${row.termLabel}-${row.date}-${row.rowIndex}`}>
                        {row.showTerm && (
                          <td rowSpan={row.termRowSpan} className="mergedTermCell">
                            {row.termLabel}
                          </td>
                        )}

                        {row.showWeek && (
                          <td rowSpan={row.weekRowSpan} className="mergedWeekCell">
                            <input
                              type="text"
                              className="tableEditInput centered"
                              value={row.weekLabel}
                              onChange={(event) => handleWeekChange(row.rowIndex, row.weekRowSpan, event.target.value)}
                            />
                          </td>
                        )}

                        <td>{toDisplayDate(row.date)}</td>
                        <td>{row.day}</td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.studentLedActivities || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "studentLedActivities", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.compensatoryWorkingDay || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "compensatoryWorkingDay", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.assessmentWeek || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "assessmentWeek", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.holidays || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "holidays", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.events || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "events", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.selfRegistration || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "selfRegistration", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tableEditInput"
                            value={row.breakColumn || ""}
                            onChange={(event) => handleColumnChange(row.rowIndex, "breakColumn", event.target.value)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {!readOnlyView && showPreview && (
        <div className="modalOverlay">
          <div className="modalCard tablePreviewCard">
            <div className="tablePreviewHeader">
              <h2 className="modalCenterTitle">Academic Calendar Preview</h2>
              <button
                type="button"
                className="previewTopClose"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
              >
                x
              </button>
            </div>

            <AcademicCalendarTemplate
              headingLines={getFormalHeadingLines()}
              model={templateModel}
              schoolName={viewData.schoolName}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default AcademicCalendarTablePage;
