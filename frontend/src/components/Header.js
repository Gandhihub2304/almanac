import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ProgramModal from "./ProgramModal";
import "./Header.css";

function Header() {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const [schools, setSchools] = useState([]);
  const [activePanel, setActivePanel] = useState("home");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(116);
  const [batches, setBatches] = useState([]);
  const [batchFetchError, setBatchFetchError] = useState("");
  const [savedBatchFilters, setSavedBatchFilters] = useState({
    schoolName: "",
    programName: "",
    batchKey: ""
  });
  const [trackFilters, setTrackFilters] = useState({
    schoolName: "",
    programName: "",
    batchKey: ""
  });
  const [trackSearchResult, setTrackSearchResult] = useState(null);
  const [trackSearchError, setTrackSearchError] = useState("");
  const [isTrackSearching, setIsTrackSearching] = useState(false);
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
      bg: "rgb(192, 34, 34)",
      border: "rgb(192, 34, 34)"
    },
    {
      matches: ["informatics"],
      bg: "rgb(229, 9, 127)",
      border: "rgb(229, 9, 127)"
    },
    {
      matches: ["management studies", "management"],
      bg: "rgb(12, 84, 160)",
      border: "rgb(12, 84, 160)"
    },
    {
      matches: ["law"],
      bg: "rgb(43, 42, 41)",
      border: "rgb(43, 42, 41)"
    },
    {
      matches: ["architecture"],
      bg: "rgb(247, 167, 7)",
      border: "rgb(247, 167, 7)"
    },
    {
      matches: ["psychology"],
      bg: "rgb(123, 62, 83)",
      border: "rgb(123, 62, 83)"
    },
    {
      matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"],
      bg: "rgb(236, 105, 31)",
      border: "rgb(236, 105, 31)"
    },
    {
      matches: ["liberal arts"],
      bg: "rgb(137, 137, 137)",
      border: "rgb(137, 137, 137)"
    },
    {
      matches: ["health sciences", "health science"],
      bg: "rgb(0, 110, 54)",
      border: "rgb(0, 110, 54)"
    },
    {
      matches: ["pharmacy"],
      bg: "rgb(120, 184, 51)",
      border: "rgb(120, 184, 51)"
    },
    {
      matches: ["school of sciences", "school of science", "sciences"],
      bg: "rgb(243, 156, 163)",
      border: "rgb(243, 156, 163)"
    },
    {
      matches: ["ph.d", "phd"],
      bg: "rgb(50, 43, 106)",
      border: "rgb(50, 43, 106)"
    }
  ];

  const getSchoolCardPalette = (schoolName) => {
    const normalized = normalizeSchoolName(schoolName);

    const matched = schoolBrandPalette.find((entry) =>
      entry.matches.some((keyword) => normalized.includes(keyword))
    );

    return matched || { bg: "#0d4e82", border: "#0d4e82" };
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
      setBatchFetchError("Unable to load batches. Restart backend server and try again.");
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
      setTrackSearchResult(null);
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

  const groupBatchesByRange = (batchList) => {
    const grouped = {};

    (batchList || []).forEach((item) => {
      const key = `${item.batchStart}-${item.batchEnd}`;
      if (!grouped[key]) {
        grouped[key] = {
          batchStart: item.batchStart,
          batchEnd: item.batchEnd,
          programs: []
        };
      }
      grouped[key].programs.push({
        name: item.program,
        year: item.year,
        id: item._id
      });
    });

    return Object.values(grouped).sort((a, b) => b.batchStart - a.batchStart);
  };

  const getSchoolForProgram = (programName) => {
    const matchedSchool = schools.find((school) =>
      (school.programs || []).some(
        (program) => (program || "").toLowerCase().replace(/\s+/g, " ").trim()
          === (programName || "").toLowerCase().replace(/\s+/g, " ").trim()
      )
    );

    return matchedSchool?.name || "School";
  };

  const clearSavedBatchFilters = () => {
    setSavedBatchFilters({
      schoolName: "",
      programName: "",
      batchKey: ""
    });
  };

  const clearTrackFilters = () => {
    setTrackFilters({
      schoolName: "",
      programName: "",
      batchKey: ""
    });
    setTrackSearchResult(null);
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
  }, [batches, savedBatchFilters]);

  const trackFilterOptions = useMemo(() => {
    const schoolNames = (schools || []).map((item) => item.name).sort((a, b) => a.localeCompare(b));

    const selectedSchool = (schools || []).find((item) => item.name === trackFilters.schoolName);
    const selectedPrograms = Array.isArray(selectedSchool?.programs) ? selectedSchool.programs : [];

    const selectedProgramBatches = trackFilters.programName
      ? batches.filter((item) => item.program === trackFilters.programName)
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
      programs: selectedPrograms.sort((a, b) => a.localeCompare(b)),
      batches: batchKeys
    };
  }, [schools, batches, trackFilters.schoolName, trackFilters.programName]);

  const parseBatchKey = (value) => {
    const [batchStartRaw, batchEndRaw] = String(value || "").split("-");
    const batchStart = Number(batchStartRaw);
    const batchEnd = Number(batchEndRaw);

    if (Number.isNaN(batchStart) || Number.isNaN(batchEnd)) {
      return null;
    }

    return { batchStart, batchEnd };
  };

  const toLocalIsoDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

  const dayDiff = (startDate, endDate) => {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const normalizeValue = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const isMeaningfulLabel = (value) => {
    const text = String(value || "").trim();
    return Boolean(text) && text !== "-";
  };

  const getTrackPhase = (row) => {
    const weekLabel = String(row?.weekLabel || "").trim();
    const combinedText = [
      row?.weekLabel,
      row?.remarks,
      row?.selfRegistration,
      row?.breakColumn,
      row?.assessmentWeek,
      row?.holidays,
      row?.events,
      row?.studentLedActivities
    ]
      .map((item) => normalizeValue(item))
      .join(" ");

    if (row?.selfRegistration || /self\s*registration/.test(combinedText)) {
      return { phaseLabel: "Self Registration", phaseMessage: "You are in the self registration week." };
    }

    if (row?.isTermBegin || /term\s*begins?|term\s*start/.test(combinedText)) {
      return { phaseLabel: "Term Begin", phaseMessage: "The term has started." };
    }

    if (row?.breakColumn && /results?\s*day/i.test(row.breakColumn)) {
      return { phaseLabel: "Results Day", phaseMessage: "Today is marked as results day." };
    }

    if (row?.assessmentWeek || /assessment|exam|test/.test(combinedText)) {
      return { phaseLabel: "Comprehensive Assessment", phaseMessage: "You are in the comprehensive assessment period." };
    }

    if (row?.breakColumn || /break/.test(combinedText)) {
      return { phaseLabel: "Term Break", phaseMessage: "You are in the term break period." };
    }

    if (isMeaningfulLabel(weekLabel)) {
      return { phaseLabel: weekLabel, phaseMessage: `You are currently in ${weekLabel}.` };
    }

    return { phaseLabel: "Current Week", phaseMessage: "You are in the current scheduled week." };
  };

  const isWithinRange = (date, start, end) => {
    if (!start || !end) return false;
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  };

  const buildFallbackTrackingResult = (almanac, todayDate) => {
    const terms = (almanac?.yearsData || [])
      .flatMap((yearItem, yearIndex) =>
        (yearItem?.terms || []).map((term, termIndex) => ({
          yearNumber: yearIndex + 1,
          termNumber: termIndex + 1,
          selfStart: parseCalendarDate(term?.selfStart),
          selfEnd: parseCalendarDate(term?.selfEnd),
          termStart: parseCalendarDate(term?.termStart),
          termEnd: parseCalendarDate(term?.termEnd),
          assessmentStart: parseCalendarDate(term?.assessmentStart),
          assessmentEnd: parseCalendarDate(term?.assessmentEnd),
          breakStart: parseCalendarDate(term?.breakStart),
          breakEnd: parseCalendarDate(term?.breakEnd)
        }))
      )
      .filter((term) => term.termStart && term.termEnd)
      .sort((a, b) => a.termStart.getTime() - b.termStart.getTime());

    if (!terms.length) {
      return null;
    }

    const firstTerm = terms[0];
    const lastTerm = terms.reduce((latest, current) => (
      !latest || current.termEnd.getTime() > latest.termEnd.getTime() ? current : latest
    ), null);

    if (todayDate.getTime() < firstTerm.termStart.getTime()) {
      const daysLeft = Math.max(0, dayDiff(todayDate, firstTerm.termStart));
      return {
        primary: "This batch is not started yet.",
        secondary: `Still there is time to start the batch. It will start on ${formatDisplayDate(toLocalIsoDate(firstTerm.termStart))} and starts in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        meta: `Term start date: ${formatDisplayDate(toLocalIsoDate(firstTerm.termStart))}`
      };
    }

    if (lastTerm && todayDate.getTime() > lastTerm.termEnd.getTime()) {
      return {
        primary: "This batch is already completed.",
        secondary: "",
        meta: ""
      };
    }

    const activeTerm = terms.find((term) => isWithinRange(todayDate, term.termStart, term.termEnd));
    if (!activeTerm) {
      const previousTerm = [...terms]
        .filter((term) => term.termEnd.getTime() < todayDate.getTime())
        .sort((a, b) => b.termEnd.getTime() - a.termEnd.getTime())[0];
      const nextTerm = terms.find((term) => term.termStart.getTime() > todayDate.getTime());

      if (previousTerm && nextTerm && previousTerm.yearNumber !== nextTerm.yearNumber) {
        return {
          primary: "This year is already completed.",
          secondary: "",
          meta: ""
        };
      }

      if (!nextTerm) {
        return null;
      }

      const daysToNextTerm = Math.max(0, dayDiff(todayDate, nextTerm.termStart));
      return {
        primary: "The current date is between terms.",
        secondary: `Next term starts on ${formatDisplayDate(toLocalIsoDate(nextTerm.termStart))} (${daysToNextTerm} day${daysToNextTerm === 1 ? "" : "s"} left).`,
        meta: `Upcoming term: Year ${nextTerm.yearNumber} Term ${nextTerm.termNumber}`
      };
    }

    if (activeTerm.selfStart && activeTerm.selfEnd && isWithinRange(todayDate, activeTerm.selfStart, activeTerm.selfEnd)) {
      const daysLeft = Math.max(0, dayDiff(todayDate, activeTerm.selfEnd));
      return {
        primary: "You are in the Self Registration week.",
        secondary: `Term starts on ${formatDisplayDate(toLocalIsoDate(activeTerm.termStart))}. ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in self registration period.`,
        meta: `Year ${activeTerm.yearNumber} Term ${activeTerm.termNumber}`
      };
    }

    if (activeTerm.assessmentStart && activeTerm.assessmentEnd && isWithinRange(todayDate, activeTerm.assessmentStart, activeTerm.assessmentEnd)) {
      const daysLeft = Math.max(0, dayDiff(todayDate, activeTerm.assessmentEnd));
      return {
        primary: "You are in the Comprehensive Assessment period.",
        secondary: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in assessment week.`,
        meta: `Year ${activeTerm.yearNumber} Term ${activeTerm.termNumber}`
      };
    }

    if (activeTerm.breakStart && activeTerm.breakEnd && isWithinRange(todayDate, activeTerm.breakStart, activeTerm.breakEnd)) {
      const daysLeft = Math.max(0, dayDiff(todayDate, activeTerm.breakEnd));
      return {
        primary: "You are in the Term Break period.",
        secondary: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to complete break.`,
        meta: `Year ${activeTerm.yearNumber} Term ${activeTerm.termNumber}`
      };
    }

    const weekNumber = Math.floor(Math.max(0, dayDiff(activeTerm.termStart, todayDate)) / 7) + 1;
    const nextWeekStart = new Date(activeTerm.termStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + (weekNumber * 7));

    const hasNextWeekInsideTerm = nextWeekStart.getTime() <= activeTerm.termEnd.getTime();
    const daysToNextWeek = hasNextWeekInsideTerm ? Math.max(0, dayDiff(todayDate, nextWeekStart)) : 0;

    return {
      primary: `Currently in Week ${weekNumber}.`,
      secondary: hasNextWeekInsideTerm
        ? `${daysToNextWeek} day${daysToNextWeek === 1 ? "" : "s"} left to reach Week ${weekNumber + 1} (starts on ${formatDisplayDate(toLocalIsoDate(nextWeekStart))}).`
        : "This is the final week of the active term.",
      meta: `Year ${activeTerm.yearNumber} Term ${activeTerm.termNumber} | Term start date: ${formatDisplayDate(toLocalIsoDate(activeTerm.termStart))}`
    };
  };

  const handleTrackAcademicSearch = async () => {
    setTrackSearchError("");
    setTrackSearchResult(null);

    if (!trackFilters.schoolName || !trackFilters.programName || !trackFilters.batchKey) {
      setTrackSearchError("Please select School, Programme, and Batch before searching.");
      return;
    }

    const parsedBatch = parseBatchKey(trackFilters.batchKey);
    if (!parsedBatch) {
      setTrackSearchError("Invalid batch selected.");
      return;
    }

    try {
      setIsTrackSearching(true);

      const matchedAlmanacBatch = batches.find((item) =>
        normalizeValue(item.program) === normalizeValue(trackFilters.programName)
        && Number(item.batchStart) === parsedBatch.batchStart
        && Number(item.batchEnd) === parsedBatch.batchEnd
      );

      if (matchedAlmanacBatch?._id) {
        const almanacRes = await axios.get(`http://localhost:5000/api/almanac/${matchedAlmanacBatch._id}`);
        const fallbackResult = buildFallbackTrackingResult(almanacRes?.data, parseCalendarDate(new Date()));

        if (fallbackResult) {
          setTrackSearchResult({
            title: `${trackFilters.programName} (${trackFilters.batchKey}) tracking`,
            primary: fallbackResult.primary,
            secondary: fallbackResult.secondary,
            meta: `School: ${trackFilters.schoolName} | ${fallbackResult.meta}`
          });
          return;
        }
      }

      const savedCalendarsRes = await axios.get("http://localhost:5000/api/almanac/saved-calendars");
      const savedCalendars = Array.isArray(savedCalendarsRes.data) ? savedCalendarsRes.data : [];

      const matchedCalendars = savedCalendars.filter((item) => {
        const schoolName = item.schoolName || getSchoolForProgram(item.program);
        return normalizeSchoolName(schoolName) === normalizeSchoolName(trackFilters.schoolName)
          && normalizeValue(item.program) === normalizeValue(trackFilters.programName)
          && Number(item.batchStart) === parsedBatch.batchStart
          && Number(item.batchEnd) === parsedBatch.batchEnd;
      });

      if (!matchedCalendars.length) {
        setTrackSearchError("No saved academic calendar data found for this selection.");
        return;
      }

      const detailResponses = await Promise.all(
        matchedCalendars
          .filter((item) => item.calendarId)
          .map((item) => axios.get(`http://localhost:5000/api/almanac/saved-calendars/${item.calendarId}`))
      );

      const allRows = detailResponses
        .map((response) => ({
          yearNumber: Number(response?.data?.yearNumber || 0),
          rows: Array.isArray(response?.data?.rows) ? response.data.rows : []
        }))
        .flatMap((entry) =>
          entry.rows.map((row) => ({
            ...row,
            yearNumber: entry.yearNumber,
            dateObj: parseCalendarDate(row?.date),
            isoDate: toLocalIsoDate(parseCalendarDate(row?.date))
          }))
        )
        .filter((row) => row.dateObj && row.isoDate)
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      if (!allRows.length) {
        if (!matchedAlmanacBatch?._id) {
          setTrackSearchError("No valid saved rows or almanac ranges found for this selection.");
          return;
        }

        const almanacRes = await axios.get(`http://localhost:5000/api/almanac/${matchedAlmanacBatch._id}`);
        const fallbackResult = buildFallbackTrackingResult(almanacRes?.data, parseCalendarDate(new Date()));

        if (!fallbackResult) {
          setTrackSearchError("Unable to calculate live tracking from saved almanac ranges.");
          return;
        }

        setTrackSearchResult({
          title: `${trackFilters.programName} (${trackFilters.batchKey}) tracking`,
          primary: fallbackResult.primary,
          secondary: fallbackResult.secondary,
          meta: `School: ${trackFilters.schoolName} | ${fallbackResult.meta}`
        });
        return;
      }

      const todayDate = parseCalendarDate(new Date());
      const todayIso = toLocalIsoDate(todayDate);
      const todayIndex = allRows.findIndex((row) => row.isoDate === todayIso);
      const firstRow = allRows[0];
      const lastRow = allRows[allRows.length - 1];

      if (todayDate.getTime() < firstRow.dateObj.getTime()) {
        const daysUntilStart = Math.max(0, dayDiff(todayDate, firstRow.dateObj));
        setTrackSearchResult({
          title: `${trackFilters.programName} (${trackFilters.batchKey}) tracking`,
          primary: `This batch is not started yet.`,
          secondary: `Still there is time to start the batch. It will start on ${formatDisplayDate(firstRow.isoDate)} and starts in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}.`,
          meta: `School: ${trackFilters.schoolName}`
        });
        return;
      }

      if (todayDate.getTime() > lastRow.dateObj.getTime()) {
        setTrackSearchResult({
          primary: `This batch is already completed.`,
          secondary: "",
          meta: ""
        });
        return;
      }

      let currentRow = null;
      let contextMessage = "";

      if (todayIndex >= 0) {
        currentRow = allRows[todayIndex];
        contextMessage = `Today is ${formatDisplayDate(currentRow.isoDate)}.`;
      } else {
        const previousRows = allRows.filter((row) => row.dateObj.getTime() < todayDate.getTime());
        currentRow = previousRows[previousRows.length - 1] || firstRow;
        contextMessage = `Today (${formatDisplayDate(todayIso)}) is between saved dates. Latest tracked date is ${formatDisplayDate(currentRow.isoDate)}.`;
      }

      const currentWeekLabel = isMeaningfulLabel(currentRow.weekLabel)
        ? currentRow.weekLabel
        : "Current Week";
      const trackPhase = getTrackPhase(currentRow);

      const nextTermBeginRow = allRows.find((row) =>
        row.dateObj.getTime() >= todayDate.getTime()
        && Boolean(row.isTermBegin)
      );

      const nextWeekRow = allRows.find((row) =>
        row.dateObj.getTime() > todayDate.getTime()
        && normalizeValue(row.weekLabel) !== normalizeValue(currentWeekLabel)
      );

      const currentReferenceDate = todayDate;
      const daysToNextWeek = nextWeekRow ? Math.max(0, dayDiff(currentReferenceDate, nextWeekRow.dateObj)) : 0;

      const termStartMessage = nextTermBeginRow
        ? `Term start date: ${formatDisplayDate(nextTermBeginRow.isoDate)}.`
        : "";

      const nextWeekMessage = nextWeekRow
        ? `${daysToNextWeek} day${daysToNextWeek === 1 ? "" : "s"} left to reach ${nextWeekRow.weekLabel || "next week"} (starts on ${formatDisplayDate(nextWeekRow.isoDate)}).`
        : "This appears to be the final recorded week for this batch.";

      const secondaryMessage = termStartMessage
        ? `${nextWeekMessage} ${termStartMessage}`
        : nextWeekMessage;

      setTrackSearchResult({
        title: `${trackFilters.programName} (${trackFilters.batchKey}) tracking`,
        primary: `${trackFilters.programName} is currently in ${currentWeekLabel}. ${trackPhase.phaseMessage}`,
        secondary: secondaryMessage,
        meta: `School: ${trackFilters.schoolName} | ${contextMessage} | Phase: ${trackPhase.phaseLabel}`
      });
    } catch (error) {
      console.error("Track academic search error:", error);
      setTrackSearchError(error?.response?.data?.message || "Unable to track the selected academic calendar.");
    } finally {
      setIsTrackSearching(false);
    }
  };

  const handleDeleteSavedAlmanac = async (batchItem) => {
    const shouldDelete = window.confirm(
      `Delete saved almanac for ${batchItem.batchStart}-${batchItem.batchEnd} / ${batchItem.program}?`
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
      setBatchFetchError(error?.response?.data?.message || "Unable to delete saved almanac.");
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
      alert("Enter school name and add at least one programme");
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
      alert("School name and programmes are required");
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

    const shouldDelete = window.confirm("Delete this school?");
    if (!shouldDelete) {
      return;
    }

    await axios.delete(`http://localhost:5000/api/schools/${editSchoolId}`);
    await fetchSchools();
  };

  return (
    <>
      <section
        className="landingShell"
        style={{
          "--header-offset": `${headerOffset}px`,
          "--drawer-width": isDrawerCollapsed ? "86px" : "202px"
        }}
      >
        <div className="header" ref={headerRef}>
          <img src="/Aurora Logo.png" alt="Aurora Logo" className="headerLogo" />
          <div className="heroTitleWrap">
            <h1 className="headerTitle" onClick={() => setActivePanel("home")}>
              Aurora University Almanac
            </h1>
          </div>
          <p className="headerSubTitle">
            Build, manage, and review academic almanac plans with a cleaner workflow.
          </p>
        </div>

        <aside className={`sideDrawer ${isDrawerCollapsed ? "collapsed" : ""}`}>
          <button
            type="button"
            className="drawerCollapseToggle"
            onClick={() => setIsDrawerCollapsed((current) => !current)}
            aria-label={isDrawerCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isDrawerCollapsed ? "Expand" : "Collapse"}
          >
            <span className="drawerCollapseIcon" aria-hidden="true">
              {isDrawerCollapsed ? ">" : "<"}
            </span>
          </button>
          {drawerItems.map((item) => (
            <button
              key={item.key}
              className={`drawerLink ${activePanel === item.key ? "active" : ""}`}
              onClick={() => openPanel(item.key)}
              title={item.title}
              aria-label={item.title}
            >
              <span className="drawerIcon" aria-hidden="true">{item.icon}</span>
              {!isDrawerCollapsed && <span className="drawerText">{item.label}</span>}
              {!isDrawerCollapsed && <span className="drawerChevron" aria-hidden="true">&gt;</span>}
            </button>
          ))}
        </aside>

        {activePanel === "home" && (
          <section className="plainPanel">
            <div className="panelTitleRow">
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
                    className="schoolCard"
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
                          setBatchFetchError("Invalid almanac id for selected card.");
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

            {batchFetchError && <p className="panelInfo">{batchFetchError}</p>}

            {!batchFetchError && (
              <div className="savedBatchFilterBar trackFilterBar">
                <div className="savedBatchFilterItem">
                  <label htmlFor="track-school">School</label>
                  <select
                    id="track-school"
                    value={trackFilters.schoolName}
                    onChange={(event) => {
                      setTrackFilters({
                        schoolName: event.target.value,
                        programName: "",
                        batchKey: ""
                      });
                      setTrackSearchResult(null);
                      setTrackSearchError("");
                    }}
                  >
                    <option value="">Select School</option>
                    {trackFilterOptions.schools.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="track-program">Programme</label>
                  <select
                    id="track-program"
                    value={trackFilters.programName}
                    disabled={!trackFilters.schoolName}
                    onChange={(event) => {
                      setTrackFilters((current) => ({
                        ...current,
                        programName: event.target.value,
                        batchKey: ""
                      }));
                      setTrackSearchResult(null);
                      setTrackSearchError("");
                    }}
                  >
                    <option value="">Select Programme</option>
                    {trackFilterOptions.programs.map((programName) => (
                      <option key={programName} value={programName}>
                        {programName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="track-batch">Batch</label>
                  <select
                    id="track-batch"
                    value={trackFilters.batchKey}
                    disabled={!trackFilters.programName}
                    onChange={(event) => {
                      setTrackFilters((current) => ({
                        ...current,
                        batchKey: event.target.value
                      }));
                      setTrackSearchResult(null);
                      setTrackSearchError("");
                    }}
                  >
                    <option value="">Select Batch</option>
                    {trackFilterOptions.batches.map((batchKey) => (
                      <option key={batchKey} value={batchKey}>
                        {batchKey}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="formButton primary trackSearchButton"
                  onClick={handleTrackAcademicSearch}
                  disabled={isTrackSearching}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24-1.4 1.4-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
                  </svg>
                  {isTrackSearching ? "Searching..." : "Search"}
                </button>

                <button className="formButton" onClick={clearTrackFilters}>Clear Filters</button>
              </div>
            )}

            {trackSearchError && <p className="panelInfo">{trackSearchError}</p>}

            {trackSearchResult && (
              <div className="trackResultCard">
                {trackSearchResult.title && trackSearchResult.primary !== "This batch is already completed." && (
                  <h3>{trackSearchResult.title}</h3>
                )}
                <p className="trackResultPrimary">{trackSearchResult.primary}</p>
                {trackSearchResult.secondary && <p>{trackSearchResult.secondary}</p>}
                {trackSearchResult.meta && <p className="trackResultMeta">{trackSearchResult.meta}</p>}
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