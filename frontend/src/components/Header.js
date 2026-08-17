import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ProgramModal from "./ProgramModal";
import * as XLSX from "xlsx";
import { getYearLabels } from "../utils/yearLabels";
import "./Header.css";

function Header() {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const currentCalendarYear = new Date().getFullYear();
  const [schools, setSchools] = useState([]);
  const [activePanel, setActivePanel] = useState("home");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [hoveredSchoolId, setHoveredSchoolId] = useState(null);
  const [isDrawerCollapsed] = useState(true);
  const [isDrawerHoverExpanded, setIsDrawerHoverExpanded] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(116);
  const [batches, setBatches] = useState([]);
  const [batchFetchError, setBatchFetchError] = useState("");
  const [savedBatchFilters, setSavedBatchFilters] = useState({
    schoolName: "",
    programName: "",
    batchKey: ""
  });
  const [trackSchoolName, setTrackSchoolName] = useState("");
  const [trackSheetSchool, setTrackSheetSchool] = useState("");
  const [trackSheetRows, setTrackSheetRows] = useState([]);
  const [trackSearchError, setTrackSearchError] = useState("");
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [addSchoolName, setAddSchoolName] = useState("");
  const [addProgramInput, setAddProgramInput] = useState("");
  const [addPrograms, setAddPrograms] = useState([]);
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editPrograms, setEditPrograms] = useState([]);
  const [editProgramInput, setEditProgramInput] = useState("");

  const normalizeSchoolName = (value) =>
    (value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const schoolBrandPalette = [
    {
      matches: ["engineering"],
      bg: "linear-gradient(135deg, #f8fbff 0%, #dcecff 100%)",
      border: "#b4cfe9"
    },
    {
      matches: ["informatics"],
      bg: "linear-gradient(135deg, #fbfdff 0%, #e4edf9 100%)",
      border: "#c0d6ea"
    },
    {
      matches: ["management studies", "management"],
      bg: "linear-gradient(135deg, #f6faff 0%, #d8e8f8 100%)",
      border: "#b3d0e8"
    },
    {
      matches: ["law"],
      bg: "linear-gradient(135deg, #fcfdff 0%, #ebf1f7 100%)",
      border: "#c3d2df"
    },
    {
      matches: ["architecture"],
      bg: "linear-gradient(135deg, #f8fbff 0%, #e0ebf7 100%)",
      border: "#b9cede"
    },
    {
      matches: ["psychology"],
      bg: "linear-gradient(135deg, #f7fbff 0%, #dce7fb 100%)",
      border: "#b4c6e6"
    },
    {
      matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"],
      bg: "linear-gradient(135deg, #f8fbff 0%, #e2ecf8 100%)",
      border: "#bccfe0"
    },
    {
      matches: ["liberal arts"],
      bg: "linear-gradient(135deg, #f8fbff 0%, #dde7f2 100%)",
      border: "#bccada"
    },
    {
      matches: ["health sciences"],
      bg: "linear-gradient(135deg, #f6fbff 0%, #d9ecfb 100%)",
      border: "#b1d3eb"
    },
    {
      matches: ["pharmacy"],
      bg: "linear-gradient(135deg, #f8fbff 0%, #e2edf8 100%)",
      border: "#bfd0e0"
    },
    {
      matches: ["school of sciences", "school of science", "sciences"],
      bg: "linear-gradient(135deg, #f6faff 0%, #dce6fb 100%)",
      border: "#b5c8e5"
    },
    {
      matches: ["ph.d", "phd"],
      bg: "linear-gradient(135deg, #eef5ff 0%, #d8e6fb 100%)",
      border: "#aabfe0"
    }
  ];

  const getSchoolCardPalette = (schoolName) => {
    const normalized = normalizeSchoolName(schoolName);

    const matched = schoolBrandPalette.find((entry) =>
      entry.matches.some((keyword) => normalized.includes(keyword))
    );

    return matched
      ? { bg: "#ffffff", border: matched.border }
      : { bg: "#ffffff", border: "#adc7e2" };
  };

  const drawerItems = [
    {
      key: "home",
      label: "Home",
      title: "Home",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6.2H9.5V21H5a1 1 0 0 1-1-1z" />
        </svg>
      )
    },
    {
      key: "trackAcademic",
      label: "Track Academic",
      title: "Track Academic",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v3h12V5H6zm0 5v9h12v-9H6zm2 2h3v3H8v-3zm5 0h3v3h-3v-3z" />
        </svg>
      )
    },
    {
      key: "view",
      label: "Almanacs",
      title: "View",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5c-5.5 0-9.9 3.3-11 7 1.1 3.7 5.5 7 11 7s9.9-3.3 11-7c-1.1-3.7-5.5-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
        </svg>
      )
    },
    {
      key: "add",
      label: "Add School",
      title: "Add",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.5 3.5 8v13.5h6.2v-5.8h4.6v5.8h6.2V8L12 2.5zm0 2.5 6 4v11h-2.2v-5.8H8.2V20H6V9z" />
        </svg>
      )
    },
    {
      key: "edit",
      label: "Edit School",
      title: "Edit",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m17.6 3.8 2.6 2.6a1 1 0 0 1 0 1.4l-9.8 9.8-4.2.8.8-4.2 9.8-9.8a1 1 0 0 1 1.4 0zM6.5 19.5h11a1 1 0 1 1 0 2h-11a1 1 0 1 1 0-2z" />
        </svg>
      )
    }
  ];

  const fetchSchools = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/schools");
      setSchools(res.data || []);
    } catch (error) {
      console.error("Fetch schools error:", error);
      setSchools([]);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/almanac/batches");
      setBatches(res.data || []);
      setBatchFetchError("");
    } catch (error) {
      console.error("Fetch batches error:", error);
      setBatches([]);
      setBatchFetchError("Unable to load saved almanacs. Please check that the server is running and try again.");
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (!headerRef.current) {
        return;
      }
      const { height } = headerRef.current.getBoundingClientRect();
      setHeaderOffset(Math.ceil(height));
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, []);

  useEffect(() => {
    if (activePanel !== "edit") {
      return;
    }

    const firstSchool = schools[0];

    if (!firstSchool) {
      setEditSchoolId("");
      setEditSchoolName("");
      setEditPrograms([]);
      return;
    }

    if (editSchoolId) {
      const updatedSchool = schools.find((school) => school._id === editSchoolId);
      if (updatedSchool) {
        setEditSchoolName(updatedSchool.name || "");
        setEditPrograms([...(updatedSchool.programs || [])]);
        return;
      }
    }

    setEditSchoolId(firstSchool._id);
    setEditSchoolName(firstSchool.name || "");
    setEditPrograms([...(firstSchool.programs || [])]);
  }, [activePanel, schools, editSchoolId]);

  const openPanel = async (panel) => {
    if (panel === "home") {
      setActivePanel("home");
      navigate("/");
      return;
    }

    if (panel === "trackAcademic") {
      await fetchBatches();
      setTrackSchoolName("");
      setTrackSheetSchool("");
      setTrackSheetRows([]);
      setTrackSearchError("");
      setActivePanel("trackAcademic");
      return;
    }

    if (panel === "view") {
      await fetchBatches();
    }
    setActivePanel(panel);
  };

  const programCountLabel = (count) => {
    if (count === 1) {
      return "1 Programme";
    }
    return `${count} Programmes`;
  };

  const getSchoolForProgram = useCallback((programName) => {
    const matchedSchool = schools.find((school) =>
      (school.programs || []).some(
        (program) => (program || "").toLowerCase().replace(/\s+/g, " ").trim()
          === (programName || "").toLowerCase().replace(/\s+/g, " ").trim()
      )
    );

    return matchedSchool?.name || "School";
  }, [schools]);

  const clearSavedBatchFilters = () => {
    setSavedBatchFilters({
      schoolName: "",
      programName: "",
      batchKey: ""
    });
  };

  const clearTrackFilters = () => {
    setTrackSchoolName("");
    setTrackSheetSchool("");
    setTrackSheetRows([]);
    setTrackSearchError("");
  };

  const savedBatchOptions = useMemo(() => {
    const schoolNames = (schools || []).map((item) => item.name).sort((a, b) => a.localeCompare(b));

    const selectedSchool = (schools || []).find((item) => item.name === savedBatchFilters.schoolName);
    const selectedPrograms = Array.isArray(selectedSchool?.programs) ? selectedSchool.programs : [];

    const programNames = selectedPrograms.sort((a, b) => a.localeCompare(b));

    const selectedProgramBatches = savedBatchFilters.programName
      ? batches.filter((item) => item.program === savedBatchFilters.programName)
      : [];

    const batchKeys = Array.from(
      new Set(selectedProgramBatches.map((item) => `${item.batchStart}-${item.batchEnd}`))
    ).sort((a, b) => {
      const [aStart] = a.split("-").map(Number);
      const [bStart] = b.split("-").map(Number);
      return bStart - aStart;
    });

    return {
      schools: schoolNames,
      programs: programNames,
      batches: batchKeys
    };
  }, [schools, batches, savedBatchFilters.schoolName, savedBatchFilters.programName]);

  const filteredSavedBatches = useMemo(() => {
    return batches.filter((item) => {
      const schoolName = getSchoolForProgram(item.program);
      const batchKey = `${item.batchStart}-${item.batchEnd}`;

      if (savedBatchFilters.schoolName && schoolName !== savedBatchFilters.schoolName) {
        return false;
      }

      if (savedBatchFilters.programName && item.program !== savedBatchFilters.programName) {
        return false;
      }

      if (savedBatchFilters.batchKey && batchKey !== savedBatchFilters.batchKey) {
        return false;
      }

      return true;
    });
  }, [batches, savedBatchFilters, getSchoolForProgram]);

  const trackSchoolOptions = useMemo(
    () => (schools || []).map((item) => item.name).sort((a, b) => a.localeCompare(b)),
    [schools]
  );

  const parseCalendarDate = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const [year, month, day] = normalized.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const formatDisplayDate = (value) => {
    const date = parseCalendarDate(value);
    if (!date) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const normalizeValue = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const shiftCalendarDate = (value, daysToAdd) => {
    const date = parseCalendarDate(value);
    if (!date) return null;

    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + daysToAdd);
    return shifted;
  };

  const formatDisplayRange = (startValue, endValue) => {
    const startDate = parseCalendarDate(startValue);
    const endDate = parseCalendarDate(endValue);

    if (!startDate && !endDate) {
      return "-";
    }

    if (startDate && endDate) {
      const startLabel = formatDisplayDate(startDate);
      const endLabel = formatDisplayDate(endDate);
      return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
    }

    return formatDisplayDate(startDate || endDate);
  };

  const isDateRangeOverlap = (leftStart, leftEnd, rightStart, rightEnd) => (
    leftStart.getTime() <= rightEnd.getTime() && leftEnd.getTime() >= rightStart.getTime()
  );

  const getTermExclusionRanges = (term) => {
    const ranges = [];
    const addRange = (item) => {
      const start = parseCalendarDate(item?.start);
      const end = parseCalendarDate(item?.end);
      if (start && end) {
        ranges.push({ start, end });
      }
    };

    if (Array.isArray(term?.activities)) {
      term.activities.forEach(addRange);
    }

    if (Array.isArray(term?.holidays)) {
      term.holidays.forEach(addRange);
    }

    return ranges;
  };

  const getTermWeekRanges = (term, weekCount = 10) => {
    const termStart = parseCalendarDate(term?.termStart || term?.selfStart);
    const termEnd = parseCalendarDate(term?.termEnd);
    if (!termStart || !termEnd) return [];

    const exclusionRanges = getTermExclusionRanges(term);
    const weekRanges = [];
    const currentStart = new Date(termStart);

    while (weekRanges.length < weekCount && currentStart.getTime() <= termEnd.getTime()) {
      const weekEnd = new Date(currentStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const clippedWeekEnd = weekEnd.getTime() > termEnd.getTime() ? termEnd : weekEnd;

      const intersectsExclusion = exclusionRanges.some((range) => (
        isDateRangeOverlap(currentStart, clippedWeekEnd, range.start, range.end)
      ));

      if (!intersectsExclusion) {
        weekRanges.push({ start: new Date(currentStart), end: clippedWeekEnd });
      }

      currentStart.setDate(currentStart.getDate() + 7);
    }

    return weekRanges;
  };

  const getTrackTermDates = (term) => {
    const activityDates = Array.isArray(term?.activities)
      ? term.activities.flatMap((activity) => [activity?.start, activity?.end])
      : [];

    const holidayDates = Array.isArray(term?.holidays)
      ? term.holidays.flatMap((holiday) => [holiday?.start, holiday?.end])
      : [];

    return [
      term?.selfStart,
      term?.selfEnd,
      term?.termStart,
      term?.termEnd,
      term?.assessmentStart,
      term?.assessmentEnd,
      term?.breakStart,
      term?.breakEnd,
      ...activityDates,
      ...holidayDates
    ]
      .map((dateValue) => parseCalendarDate(dateValue))
      .filter(Boolean);
  };

  const buildTrackSheetSummary = (almanac) => {
    const yearsData = Array.isArray(almanac?.yearsData) ? almanac.yearsData : [];
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const candidates = yearsData.map((yearData, yearIndex) => {
      const terms = Array.isArray(yearData?.terms) ? [...yearData.terms] : [];
      const orderedTerms = terms
        .filter((term) => term && (term.termStart || term.selfStart))
        .sort((left, right) => {
          const leftStart = parseCalendarDate(left.termStart || left.selfStart);
          const rightStart = parseCalendarDate(right.termStart || right.selfStart);

          if (!leftStart && !rightStart) return 0;
          if (!leftStart) return 1;
          if (!rightStart) return -1;
          return leftStart.getTime() - rightStart.getTime();
        });

      const yearDates = terms.flatMap((term) => getTrackTermDates(term));
      if (!yearDates.length) {
        return null;
      }

      const yearStart = new Date(Math.min(...yearDates.map((date) => date.getTime())));
      yearStart.setHours(0, 0, 0, 0);

      const yearEnd = new Date(Math.max(...yearDates.map((date) => date.getTime())));
      yearEnd.setHours(23, 59, 59, 999);

      const activeTerm = orderedTerms.find((term) => {
        const termStart = parseCalendarDate(term.termStart || term.selfStart || term.assessmentStart || term.breakStart);
        const termEnd = parseCalendarDate(term.termEnd || term.assessmentEnd || term.breakEnd || term.selfEnd || term.termStart || term.selfStart);
        if (!termStart || !termEnd) {
          return false;
        }

        const start = new Date(termStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(termEnd);
        end.setHours(23, 59, 59, 999);
        return currentDate.getTime() >= start.getTime() && currentDate.getTime() <= end.getTime();
      });

      const containsCurrentDate =
        currentDate.getTime() >= yearStart.getTime() && currentDate.getTime() <= yearEnd.getTime();

      const hasCurrentCalendarYear = yearDates.some((date) => date.getFullYear() === currentCalendarYear);

      const distanceFromCurrentDate = containsCurrentDate
        ? 0
        : Math.min(
          Math.abs(currentDate.getTime() - yearStart.getTime()),
          Math.abs(currentDate.getTime() - yearEnd.getTime())
        );

      return {
        yearData,
        yearIndex,
        orderedTerms,
        activeTerm,
        containsCurrentDate,
        hasCurrentCalendarYear,
        distanceFromCurrentDate
      };
    }).filter(Boolean);

    if (!candidates.length) {
      return [];
    }

    candidates.sort((left, right) => {
      if (left.containsCurrentDate !== right.containsCurrentDate) {
        return left.containsCurrentDate ? -1 : 1;
      }

      if (left.hasCurrentCalendarYear !== right.hasCurrentCalendarYear) {
        return left.hasCurrentCalendarYear ? -1 : 1;
      }

      if (Boolean(left.activeTerm) !== Boolean(right.activeTerm)) {
        return left.activeTerm ? -1 : 1;
      }

      return left.distanceFromCurrentDate - right.distanceFromCurrentDate;
    });

    const selectedYear = candidates[0];
    const terms = Array.isArray(selectedYear.yearData?.terms) ? [...selectedYear.yearData.terms] : [];
    const orderedTerms = selectedYear.orderedTerms;
    const primaryTerm = selectedYear.activeTerm || orderedTerms[0] || {};
    const selfRegistration = formatDisplayRange(primaryTerm.selfStart, primaryTerm.selfEnd);

    const trackedWeekRanges = getTermWeekRanges(primaryTerm, 10);

    const weekColumns = Array.from({ length: 10 }, (_, index) => {
      const week = trackedWeekRanges[index];
      return week ? formatDisplayRange(week.start, week.end) : "-";
    });

    const weekRanges = trackedWeekRanges;

    const currentWeekIndex = weekRanges.findIndex((range) => (
      range
      && currentDate.getTime() >= range.start.getTime()
      && currentDate.getTime() <= range.end.getTime()
    ));

    const assessmentTerm = selectedYear.activeTerm
      || orderedTerms.find((term) => term.assessmentStart || term.assessmentEnd)
      || primaryTerm;
    const assessmentWeek = formatDisplayRange(assessmentTerm.assessmentStart, assessmentTerm.assessmentEnd);

    const activeTermNumber = Number(primaryTerm.termNumber);
    const termLabel = Number.isFinite(activeTermNumber) && activeTermNumber > 0
      ? `Term ${activeTermNumber}`
      : `Term ${Math.max(1, orderedTerms.findIndex((term) => term === primaryTerm) + 1)}`;

    return [{
      key: String(selectedYear.yearData?.yearNumber || selectedYear.yearIndex + 1),
      yearNumber: Number(selectedYear.yearData?.yearNumber || selectedYear.yearIndex + 1),
      termLabel,
      selfRegistration,
      weekColumns,
      currentWeekIndex,
      assessmentWeek
    }];
  };

  const loadTrackSheetForSchool = async (schoolName) => {
    setTrackSearchError("");
    setTrackSheetRows([]);

    if (!schoolName) {
      setTrackSheetSchool("");
      return;
    }

    setIsTrackLoading(true);
    try {
      let matchedBatches = [];
      if (schoolName === "ALL") {
        matchedBatches = batches;
      } else {
        matchedBatches = batches.filter((item) => {
          const itemSchool = getSchoolForProgram(item.program);
          return normalizeSchoolName(itemSchool) === normalizeSchoolName(schoolName);
        });

        if (!matchedBatches.length) {
          setTrackSheetSchool(schoolName);
          setTrackSearchError("No saved almanac found for this school.");
          return;
        }
      }

      const detailResponses = await Promise.all(
        matchedBatches
          .filter((item) => item._id)
          .map((item) => axios.get(`http://localhost:5000/api/almanac/${item._id}`))
      );

      const rows = detailResponses
        .map((response) => response?.data)
        .filter(Boolean)
        .flatMap((almanac) => {
          const summaryRows = buildTrackSheetSummary(almanac);
          const yearLabels = getYearLabels(almanac.year);
          const schoolForAlmanac = getSchoolForProgram(almanac.program);

          return summaryRows.map((summary) => ({
            key: `${almanac._id}-${summary.key}`,
            school: schoolForAlmanac,
            batch: `${almanac.batchStart}-${almanac.batchEnd} (${yearLabels[summary.yearNumber - 1] || `Year ${summary.yearNumber}`})`,
            program: almanac.program || "-",
            termLabel: summary.termLabel,
            selfRegistration: summary.selfRegistration,
            weekColumns: summary.weekColumns,
            currentWeekIndex: summary.currentWeekIndex,
            assessmentWeek: summary.assessmentWeek,
            batchStart: Number(almanac.batchStart || 0),
            yearNumber: Number(summary.yearNumber || 0)
          }));
        })
        .sort((left, right) => {
          if (right.batchStart !== left.batchStart) return right.batchStart - left.batchStart;
          if (right.yearNumber !== left.yearNumber) return right.yearNumber - left.yearNumber;
          return String(left.program || "").localeCompare(String(right.program || ""));
        });

      setTrackSheetSchool(schoolName);
      setTrackSheetRows(rows);

      if (!rows.length) {
        setTrackSearchError(`No almanac data found for the current year (${currentCalendarYear}) for this school.`);
      }
    } catch (error) {
      setTrackSheetSchool(schoolName);
      setTrackSearchError(error?.response?.data?.message || "Unable to load the track sheet. Please try again.");
    } finally {
      setIsTrackLoading(false);
    }
  };

  const handleTrackSchoolChange = async (event) => {
    const schoolName = event.target.value;
    setTrackSchoolName(schoolName);
    await loadTrackSheetForSchool(schoolName);
  };

  const handleDeleteSavedAlmanac = async (batchItem) => {
    const shouldDelete = window.confirm(
      `Are you sure you want to delete the saved almanac for ${batchItem.program} (${batchItem.batchStart}-${batchItem.batchEnd})?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/almanac/${batchItem._id}`);

      setBatches((current) =>
        current.filter((item) => item._id !== batchItem._id)
      );
    } catch (error) {
      console.error("Delete saved almanac error:", error);
      setBatchFetchError(error?.response?.data?.message || "Failed to delete the saved almanac. Please try again.");
    }
  };

  const getDurationInDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getDurationWeeks = (start, end) => {
    const days = getDurationInDays(start, end);
    if (!days) return "";
    const weeks = Math.ceil(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  };

  const exportTrackExcel = async () => {
    setTrackSearchError("");
    setIsTrackLoading(true);

    try {
      // Determine which batches to include
      let matchedBatches = [];
      if (trackSchoolName === "ALL") {
        matchedBatches = batches.filter(Boolean);
      } else if (trackSchoolName) {
        matchedBatches = batches.filter((item) => {
          const itemSchool = getSchoolForProgram(item.program);
          return normalizeValue(itemSchool) === normalizeValue(trackSchoolName);
        });
      } else {
        // nothing selected
        setTrackSearchError("Please select a school or choose All to export.");
        setIsTrackLoading(false);
        return;
      }

      if (!matchedBatches.length) {
        setTrackSearchError("No batches found to export for the selected school(s).");
        setIsTrackLoading(false);
        return;
      }

      const detailResponses = await Promise.allSettled(
        matchedBatches
          .filter((item) => item._id)
          .map((item) => axios.get(`http://localhost:5000/api/almanac/${item._id}`))
      );

      const workbookRows = [];
      const columnHeaders = [];

      // Build column headers based on whether "ALL" is selected
      if (trackSchoolName === "ALL") {
        columnHeaders.push("School", "Batch", "Programme", "Current Term", "Self Registration");
      } else {
        columnHeaders.push("Batch", "Programme", "Current Term", "Self Registration");
      }
      
      // Add Week 1-10
      for (let i = 1; i <= 10; i += 1) {
        columnHeaders.push(`Week ${i}`);
      }
      columnHeaders.push("Assessment Week");

      detailResponses.forEach((resp) => {
        if (resp.status !== "fulfilled" || !resp.value?.data) return;
        const almanac = resp.value.data;
        const schoolForAlmanac = getSchoolForProgram(almanac.program);
        const yearSummaries = buildTrackSheetSummary(almanac);

        yearSummaries.forEach((summary) => {
          const weekCols = summary.weekColumns || [];
          const rowData = [];

          // Add columns in exact order matching table display
          if (trackSchoolName === "ALL") {
            rowData.push(schoolForAlmanac);
          }
          rowData.push(
            `${almanac.batchStart}-${almanac.batchEnd}`,
            almanac.program || "-",
            summary.termLabel || "-",
            summary.selfRegistration || "-"
          );

          // Add Week 1-10
          for (let i = 0; i < 10; i += 1) {
            rowData.push(weekCols[i] || "-");
          }

          rowData.push(summary.assessmentWeek || "-");

          workbookRows.push(rowData);
        });
      });

      if (!workbookRows.length) {
        setTrackSearchError("No track rows available to export.");
        setIsTrackLoading(false);
        return;
      }

      // Create sheet with explicit headers and data in correct order
      const ws = XLSX.utils.aoa_to_sheet([columnHeaders, ...workbookRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TrackAcademic");

      const filename = `track-academic-${trackSchoolName === "ALL" ? "all" : trackSchoolName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export error:", err);
      setTrackSearchError("Failed to export to Excel. Please try again.");
    } finally {
      setIsTrackLoading(false);
    }
  };

  const handleAddProgram = () => {
    if (!addProgramInput.trim()) {
      return;
    }
    setAddPrograms((prev) => [...prev, addProgramInput.trim()]);
    setAddProgramInput("");
  };

  const handleSaveSchool = async () => {
    if (!addSchoolName.trim() || addPrograms.length === 0) {
      alert("Please enter a school name and add at least one programme.");
      return;
    }

    await axios.post("http://localhost:5000/api/schools", {
      name: addSchoolName.trim(),
      programs: addPrograms
    });

    setAddSchoolName("");
    setAddProgramInput("");
    setAddPrograms([]);
    await fetchSchools();
    setActivePanel("home");
  };

  const handleEditSchoolSelect = (schoolId) => {
    const school = schools.find((item) => item._id === schoolId);
    if (!school) {
      return;
    }
    setEditSchoolId(school._id);
    setEditSchoolName(school.name || "");
    setEditPrograms([...(school.programs || [])]);
  };

  const handleEditProgramAdd = () => {
    if (!editProgramInput.trim()) {
      return;
    }
    setEditPrograms((prev) => [...prev, editProgramInput.trim()]);
    setEditProgramInput("");
  };

  const handleEditProgramChange = (index, value) => {
    setEditPrograms((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleEditProgramDelete = (index) => {
    setEditPrograms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSchool = async () => {
    if (!editSchoolId) {
      return;
    }

    if (!editSchoolName.trim() || editPrograms.length === 0) {
      alert("Please enter a school name and add at least one programme.");
      return;
    }

    await axios.put(`http://localhost:5000/api/schools/${editSchoolId}`, {
      name: editSchoolName.trim(),
      programs: editPrograms
    });

    await fetchSchools();
  };

  const handleDeleteSchool = async () => {
    if (!editSchoolId) {
      return;
    }

    const shouldDelete = window.confirm("Are you sure you want to delete this school?");
    if (!shouldDelete) {
      return;
    }

    await axios.delete(`http://localhost:5000/api/schools/${editSchoolId}`);
    await fetchSchools();
  };

  const isDrawerExpanded = !isDrawerCollapsed || isDrawerHoverExpanded;

  return (
    <>
      <section
        className="landingShell"
        style={{
          "--header-offset": `${headerOffset}px`,
          "--drawer-width": isDrawerExpanded ? "min(218px, 78vw)" : "86px"
        }}
      >
        <div className="header" ref={headerRef}>
          <div className="topBar">
            <button type="button" className="headerBrand" onClick={() => setActivePanel("home")}>
              <img src="/Aurora Logo.png" alt="Aurora University logo" className="headerLogo" />
              <span className="headerBrandCopy">
                <span className="headerBrandTitle">Aurora University</span>
                <span className="headerBrandSubtitle">Almanac Generator</span>
              </span>
            </button>

            <div className="headerActions" aria-label="Portal actions">
              <button type="button" className="headerAvatar" aria-label="User profile">
                AU
              </button>
            </div>
          </div>
        </div>

        <aside
          className={`sideDrawer ${isDrawerCollapsed ? "collapsed" : ""} ${isDrawerHoverExpanded ? "hoverExpanded" : ""}`}
          onMouseEnter={() => {
            if (isDrawerCollapsed) {
              setIsDrawerHoverExpanded(true);
            }
          }}
          onMouseLeave={() => setIsDrawerHoverExpanded(false)}
        >
          {drawerItems.map((item) => (
            <button
              key={item.key}
              className={`drawerLink ${activePanel === item.key ? "active" : ""}`}
              onClick={() => openPanel(item.key)}
              title={item.title}
              aria-label={item.title}
            >
              <span className="drawerIcon" aria-hidden="true">{item.icon}</span>
              {isDrawerExpanded && <span className="drawerText">{item.label}</span>}
            </button>
          ))}
        </aside>

        {activePanel === "home" && (
          <section className="plainPanel dashboardPanel">
            <div className="panelTitleRow dashboardSectionHeader">
              <h2 className="panelTitle">Schools</h2>
              <button
                className="academicCalendarLaunch"
                onClick={() => navigate("/academic-calendar")}
              >
                Academic Calendar
              </button>
            </div>

            <div className="cardsGrid">
              {schools.map((school, index) => {
                const palette = getSchoolCardPalette(school.name || "");

                return (
                  <button
                    key={school._id}
                    className={`schoolCard ${hoveredSchoolId === school._id ? "active" : ""}`}
                    onMouseEnter={() => setHoveredSchoolId(school._id)}
                    onClick={() => setSelectedSchool(school)}
                    style={{
                      animationDelay: `${index * 70}ms`,
                      background: palette.bg,
                      borderColor: palette.border
                    }}
                  >
                    <h3>{school.name}</h3>
                    <p>{programCountLabel((school.programs || []).length)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activePanel === "view" && (
          <section className="plainPanel">
            <h2 className="panelTitle">Almanacs</h2>
            {batchFetchError && <p className="panelInfo">{batchFetchError}</p>}
            {!batchFetchError && batches.length === 0 && (
              <p className="panelInfo">No saved almanacs.</p>
            )}

            {batches.length > 0 && (
              <div className="savedBatchFilterBar">
                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-school">School</label>
                  <select
                    id="saved-batch-school"
                    value={savedBatchFilters.schoolName}
                    onChange={(event) =>
                      setSavedBatchFilters({
                        schoolName: event.target.value,
                        programName: "",
                        batchKey: ""
                      })
                    }
                  >
                    <option value="">Select School</option>
                    {savedBatchOptions.schools.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-program">Programme</label>
                  <select
                    id="saved-batch-program"
                    value={savedBatchFilters.programName}
                    disabled={!savedBatchFilters.schoolName}
                    onChange={(event) =>
                      setSavedBatchFilters((current) => ({
                        ...current,
                        programName: event.target.value,
                        batchKey: ""
                      }))
                    }
                  >
                    <option value="">Select Programme</option>
                    {savedBatchOptions.programs.map((programName) => (
                      <option key={programName} value={programName}>
                        {programName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-range">Batch</label>
                  <select
                    id="saved-batch-range"
                    value={savedBatchFilters.batchKey}
                    disabled={!savedBatchFilters.programName}
                    onChange={(event) =>
                      setSavedBatchFilters((current) => ({
                        ...current,
                        batchKey: event.target.value
                      }))
                    }
                  >
                    <option value="">Select Batch</option>
                    {savedBatchOptions.batches.map((batchKey) => (
                      <option key={batchKey} value={batchKey}>
                        {batchKey}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="formButton" onClick={clearSavedBatchFilters}>Clear Filters</button>
              </div>
            )}

            <div className="cardsGrid">
              {filteredSavedBatches.map((batchItem, index) => {
                const schoolName = getSchoolForProgram(batchItem.program);
                const palette = getSchoolCardPalette(schoolName);

                return (
                  <div
                    key={batchItem._id}
                    className="batchCard"
                    style={{
                      animationDelay: `${index * 70}ms`,
                      background: palette.bg,
                      borderColor: palette.border
                    }}
                  >
                    <button
                      type="button"
                      className="batchCardDeleteBtn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteSavedAlmanac(batchItem);
                      }}
                      aria-label="Delete saved almanac"
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="batchCardBody"
                      onClick={() => {
                        if (!batchItem._id) {
                          setBatchFetchError("Invalid almanac ID for the selected batch.");
                          return;
                        }

                        navigate(`/almanac/view/${batchItem._id}`);
                      }}
                    >
                      <h3>{schoolName}</h3>
                      <p>{batchItem.program}</p>
                      <p>
                        Batch: {batchItem.batchStart}-{batchItem.batchEnd}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>

            {!batchFetchError && batches.length > 0 && filteredSavedBatches.length === 0 && (
              <p className="panelInfo">No saved almanacs.</p>
            )}
          </section>
        )}

        {activePanel === "trackAcademic" && (
          <section className="plainPanel">
            <h2 className="panelTitle">Track Academic</h2>

            <div className="savedBatchFilterBar trackFilterBar">
              <div className="savedBatchFilterItem">
                <label htmlFor="track-school">School</label>
                <select
                  id="track-school"
                  value={trackSchoolName}
                  onChange={handleTrackSchoolChange}
                  disabled={isTrackLoading}
                >
                  <option value="ALL">All</option>
                  <option value="">Select School</option>
                  {trackSchoolOptions.map((schoolName) => (
                    <option key={schoolName} value={schoolName}>
                      {schoolName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="trackFilterActions">
                <button className="formButton trackClearFiltersButton" onClick={clearTrackFilters}>
                  Clear Filters
                </button>
                <button
                  className="formButton exportButton"
                  onClick={exportTrackExcel}
                  disabled={isTrackLoading}
                  title="Export visible track sheet to Excel"
                >
                  Export
                </button>
              </div>
            </div>

            {trackSearchError && <p className="panelInfo">{trackSearchError}</p>}

            {isTrackLoading && <p className="panelInfo">Loading school sheet...</p>}

            {!isTrackLoading && trackSheetSchool && trackSheetRows.length > 0 && (
              <div className="trackSheetCard">
                <h3>{trackSheetSchool}</h3>

                <div className="trackSheetTableWrap">
                  <table className="trackSheetTable">
                    <thead>
                      {trackSchoolName === "ALL" ? (
                        <>
                          <tr className="trackSheetWeekHeadingRow">
                            <th colSpan="5" />
                            {Array.from({ length: 10 }, (_, index) => (
                              <th
                                key={`week-heading-${index + 1}`}
                                className={index === trackSheetRows[0]?.currentWeekIndex ? "currentWeekHeading" : ""}
                              >
                                {index === trackSheetRows[0]?.currentWeekIndex ? "Current Week" : ""}
                              </th>
                            ))}
                            <th />
                          </tr>
                          <tr>
                            <th>School</th>
                            <th>Batch</th>
                            <th>Programme</th>
                            <th>Current Term</th>
                            <th>Self Registration</th>
                            {Array.from({ length: 10 }, (_, index) => (
                              <th key={`week-head-${index + 1}`}>Week {index + 1}</th>
                            ))}
                            <th>Assessment Week</th>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr className="trackSheetWeekHeadingRow">
                            <th colSpan="4" />
                            {Array.from({ length: 10 }, (_, index) => (
                              <th
                                key={`week-heading-${index + 1}`}
                                className={index === trackSheetRows[0]?.currentWeekIndex ? "currentWeekHeading" : ""}
                              >
                                {index === trackSheetRows[0]?.currentWeekIndex ? "Current Week" : ""}
                              </th>
                            ))}
                            <th />
                          </tr>
                          <tr>
                            <th>Batch</th>
                            <th>Programme</th>
                            <th>Current Term</th>
                            <th>Self Registration</th>
                            {Array.from({ length: 10 }, (_, index) => (
                              <th key={`week-head-${index + 1}`}>Week {index + 1}</th>
                            ))}
                            <th>Assessment Week</th>
                          </tr>
                        </>
                      )}
                    </thead>
                    <tbody>
                      {trackSheetRows.map((row) => (
                        <tr key={row.key}>
                          {trackSchoolName === "ALL" && <td>{row.school}</td>}
                          <td>{row.batch}</td>
                          <td>{row.program}</td>
                          <td>{row.termLabel}</td>
                          <td>{row.selfRegistration}</td>
                          {row.weekColumns.map((weekDate, index) => (
                            <td
                              key={`${row.key}-week-${index + 1}`}
                              className={index === row.currentWeekIndex ? "currentWeekCell" : ""}
                            >
                              {weekDate}
                            </td>
                          ))}
                          <td>{row.assessmentWeek}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {activePanel === "add" && (
          <section className="plainPanel centerPanel">
            <div className="formPanel">
              <h2 className="panelTitle">Add School</h2>

              <label className="formLabel">School Name</label>
              <input
                className="formInput"
                placeholder="Enter school name"
                value={addSchoolName}
                onChange={(e) => setAddSchoolName(e.target.value)}
              />

              <label className="formLabel">Programmes</label>
              <div className="formRow">
                <input
                  className="formInput"
                  placeholder="Add one programme"
                  value={addProgramInput}
                  onChange={(e) => setAddProgramInput(e.target.value)}
                />
                <button className="formButton" onClick={handleAddProgram}>Add</button>
              </div>

              {addPrograms.length > 0 && (
                <div className="chipList">
                  {addPrograms.map((programme, index) => (
                    <span className="chip" key={`${programme}-${index}`}>{programme}</span>
                  ))}
                </div>
              )}

              <div className="formActions">
                <button className="formButton primary" onClick={handleSaveSchool}>Save</button>
                <button className="formButton" onClick={() => setActivePanel("home")}>Cancel</button>
              </div>
            </div>
          </section>
        )}

        {activePanel === "edit" && (
          <section className="plainPanel centerPanel">
            <div className="formPanel">
              <h2 className="panelTitle">Edit School</h2>

              {schools.length === 0 ? (
                <p className="panelInfo">No schools found to edit.</p>
              ) : (
                <>
                  <label className="formLabel">Choose School</label>
                  <select
                    className="formInput"
                    value={editSchoolId}
                    onChange={(e) => handleEditSchoolSelect(e.target.value)}
                  >
                    {schools.map((school) => (
                      <option key={school._id} value={school._id}>
                        {school.name}
                      </option>
                    ))}
                  </select>

                  <label className="formLabel">School Name</label>
                  <input
                    className="formInput"
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    placeholder="School name"
                  />

                  <label className="formLabel">Programmes</label>
                  {editPrograms.map((programme, index) => (
                    <div className="formRow" key={`edit-programme-${index}`}>
                      <input
                        className="formInput"
                        value={programme}
                        onChange={(e) => handleEditProgramChange(index, e.target.value)}
                      />
                      <button
                        className="formButton danger"
                        onClick={() => handleEditProgramDelete(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="formRow">
                    <input
                      className="formInput"
                      placeholder="New programme"
                      value={editProgramInput}
                      onChange={(e) => setEditProgramInput(e.target.value)}
                    />
                    <button className="formButton" onClick={handleEditProgramAdd}>Add</button>
                  </div>

                  <div className="formActions">
                    <button className="formButton primary" onClick={handleUpdateSchool}>
                      Save Changes
                    </button>
                    <button className="formButton danger" onClick={handleDeleteSchool}>
                      Delete School
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </section>

      {selectedSchool && (
        <ProgramModal school={selectedSchool} close={() => setSelectedSchool(null)} />
      )}
    </>
  );
}

export default Header;