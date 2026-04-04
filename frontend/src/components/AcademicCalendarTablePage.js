import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import "./AcademicCalendarPage.css";
import AcademicCalendarTemplate from "./AcademicCalendarTemplate";
import { buildAcademicCalendarTemplateModel } from "../utils/academicCalendarTemplate";

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

const extractDateRemarkPairsFromSheetRows = (rows, allowedDatesSet) => {
  if (!Array.isArray(rows) || !rows.length) return [];

  const headerRow = rows[0] || [];
  let dateColumn = -1;
  let remarksColumn = -1;

  for (let index = 0; index < headerRow.length; index += 1) {
    const headerText = normalizeInlineText(String(headerRow[index] || "")).toLowerCase();
    if (dateColumn < 0 && headerText === "date") {
      dateColumn = index;
    }
    if (remarksColumn < 0 && (headerText === "remarks" || headerText === "remark")) {
      remarksColumn = index;
    }
  }

  const hasHeader = dateColumn >= 0 && remarksColumn >= 0;
  const startRow = hasHeader ? 1 : 0;

  if (!hasHeader) {
    dateColumn = 0;
    remarksColumn = 1;
  }

  const pairs = [];
  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const dateValue = row[dateColumn];
    const remarks = normalizeInlineText(String(row[remarksColumn] || ""));
    if (dateValue === undefined || dateValue === null || !remarks) continue;

    const isoDate = parseDateToken(dateValue, allowedDatesSet);
    if (!isoDate) continue;
    pairs.push({ date: isoDate, remarks });
  }

  return pairs;
};

const extractDateRemarkPairsFromCsv = (text, allowedDatesSet) => {
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

  return extractDateRemarkPairsFromSheetRows(rows, allowedDatesSet);
};

const extractDateRemarkPairsFromExcel = async (arrayBuffer, allowedDatesSet) => {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
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

  return extractDateRemarkPairsFromSheetRows(rows, allowedDatesSet);
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
    dates.push(current.toISOString().split("T")[0]);
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
          const visibleLabels = labels.filter((label) => label !== "Term Work");
          const remarks = visibleLabels.length ? visibleLabels.join(" and ") : "-";
          const isSelfRegistration = labels.includes("Self Registration");
          const isBreak = labels.includes("Break");
          const isAssessment = labels.includes("Comprehensive Assessment");
          const isHoliday = labels.includes("Holiday");
          const isStudentActivity = labels.includes("Student Led Activities");

        let weekLabel = "-";
        if (isSelfRegistration) {
          weekLabel = "Self Registration";
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
          remarks
        };
      });
  });
};

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
    const ugLabels = ["Freshman Year", "Sophomore Year", "Junior Year", "Senior Year"];

    if (totalYears >= 4 && ugLabels[yearValue - 1]) {
      return ugLabels[yearValue - 1];
    }

    if (yearValue === 1) return "First Year";
    if (yearValue === 2) return "Second Year";
    if (yearValue === 3) return "Third Year";
    if (yearValue === 4) return "Fourth Year";

    return `Year ${yearValue}`;
  };

  const getFormalHeadingLines = () => {
    if (!viewData) return [];

    return [
      String(viewData.schoolName || "School").toUpperCase(),
      `${viewData.programName} of ${viewData.batchStart} - ${viewData.batchEnd}`,
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
      const totalYears = Number(savedCalendarFromState.totalYears || 0);

      setViewData({
        schoolName: savedCalendarFromState.schoolName || location.state?.schoolName || "School",
        programName: savedCalendarFromState.program || location.state?.programName || "",
        batchStart: savedCalendarFromState.batchStart,
        batchEnd: savedCalendarFromState.batchEnd,
        yearNumber: selectedYearNumber,
        totalYears,
        yearHeading: savedCalendarFromState.yearHeading || getAcademicYearHeading(selectedYearNumber, totalYears),
        terms: []
      });

      const normalizedRows = savedCalendarFromState.rows.map((row) => ({
        termLabel: row.termLabel || "-",
        date: row.date || "",
        day: row.day || "-",
        weekLabel: row.weekLabel || "-",
        remarks: row.remarks || "-"
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

        setViewData({
          schoolName: detectedSchool,
          programName: programFromState,
          batchStart: savedCalendar?.batchStart || almanac?.batchStart,
          batchEnd: savedCalendar?.batchEnd || almanac?.batchEnd,
          yearNumber: selectedYearNumber,
          totalYears: Number(savedCalendar?.totalYears || almanac?.year || 0),
          yearHeading: savedCalendar?.yearHeading || getAcademicYearHeading(selectedYearNumber, Number(savedCalendar?.totalYears || almanac?.year || 0)),
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

          return {
            ...row,
            weekLabel: matched.weekLabel || row.weekLabel,
            remarks: matched.remarks || row.remarks
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

  const handleRemarksChange = (rowIndex, value) => {
    setEditableRows((current) =>
      current.map((item, index) => (
        index === rowIndex ? { ...item, remarks: value } : item
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
      const payload = {
        rows: editableRows.map((item) => ({
          termLabel: item.termLabel,
          weekLabel: item.weekLabel,
          date: item.date,
          day: item.day,
          remarks: item.remarks
        })),
        schoolName: viewData.schoolName,
        program: viewData.programName,
        batchStart: viewData.batchStart,
        batchEnd: viewData.batchEnd,
        totalYears: viewData.totalYears,
        yearHeading: viewData.yearHeading
      };

      const endpoint = `http://localhost:5000/api/almanac/${almanacId}/year/${yearNumber}/day-wise-table`;
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
        message: backendMessage ? `${backendMessage}${statusText}` : "Unable to save table"
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
        pairs = extractDateRemarkPairsFromCsv(csvText, tableDatesSet);
      } else {
        const buffer = await file.arrayBuffer();
        pairs = await extractDateRemarkPairsFromExcel(buffer, tableDatesSet);
      }

      if (!pairs.length) {
        setPdfImportStatus({
          type: "error",
          message: "No valid Date and Remarks rows found. Use two columns named Date and Remarks."
        });
        return;
      }

      const latestRemarkByDate = new Map();
      pairs.forEach((item) => {
        latestRemarkByDate.set(item.date, item.remarks);
      });

      const uploadedDates = Array.from(latestRemarkByDate.keys());
      const unmatchedDates = uploadedDates.filter((dateValue) => !tableDatesSet.has(dateValue));
      if (unmatchedDates.length) {
        const preview = unmatchedDates.slice(0, 5).join(", ");
        const suffix = unmatchedDates.length > 5 ? " ..." : "";
        setPdfImportStatus({
          type: "error",
          message: `Date mismatch: uploaded file has dates not found in table (${preview}${suffix}). Please keep exact day, month and year.`
        });
        return;
      }

      let updatedCount = 0;
      setEditableRows((current) => current.map((row) => {
        const remarkFromFile = latestRemarkByDate.get(row.date);
        if (!remarkFromFile) return row;
        if ((row.remarks || "").trim() === remarkFromFile.trim()) return row;
        updatedCount += 1;
        return { ...row, remarks: remarkFromFile };
      }));

      if (!updatedCount) {
        setPdfImportStatus({
          type: "error",
          message: "No matching dates found between uploaded file and the table."
        });
        return;
      }

      setPdfImportStatus({
        type: "success",
        message: `${updatedCount} row(s) updated from uploaded file.`
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
            <AcademicCalendarTemplate headingLines={getFormalHeadingLines()} model={templateModel} />
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
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {!renderRows.length ? (
                    <tr>
                      <td colSpan="5" className="dayWiseEmpty">No date rows available for selected year.</td>
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
                            value={row.remarks}
                            onChange={(event) => handleRemarksChange(row.rowIndex, event.target.value)}
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

            <AcademicCalendarTemplate headingLines={getFormalHeadingLines()} model={templateModel} />
          </div>
        </div>
      )}
    </section>
  );
}

export default AcademicCalendarTablePage;
