import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import html2pdf from "html2pdf.js";
import "./AcademicCalendarPage.css";
import "./Modal.css";
import AcademicCalendarTemplate from "./AcademicCalendarTemplate";
import { buildAcademicCalendarTemplateModel } from "../utils/academicCalendarTemplate";
import { getYearLabels } from "../utils/yearLabels";

function AcademicCalendarPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [almanacBatches, setAlmanacBatches] = useState([]);
  const [expandedSchoolId, setExpandedSchoolId] = useState("");
  const [selectorState, setSelectorState] = useState({
    open: false,
    schoolName: "",
    programName: ""
  });
  const [selectedBatchKey, setSelectedBatchKey] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [savedCalendars, setSavedCalendars] = useState([]);
  const [showSavedCalendars, setShowSavedCalendars] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [downloadTemplatePayload, setDownloadTemplatePayload] = useState(null);
  const [savedFilters, setSavedFilters] = useState({
    schoolName: "",
    programName: "",
    batchKey: ""
  });
  const hiddenTemplateRef = useRef(null);

  useEffect(() => {
    const fetchSchoolsAndBatches = async () => {
      try {
        const [schoolsRes, batchesRes, savedRes] = await Promise.all([
          axios.get("http://localhost:5000/api/schools"),
          axios.get("http://localhost:5000/api/almanac/batches"),
          axios.get("http://localhost:5000/api/almanac/saved-calendars")
        ]);

        setSchools(schoolsRes.data || []);
        setAlmanacBatches(batchesRes.data || []);
        setSavedCalendars(savedRes.data || []);
      } catch (error) {
        console.error("Fetch schools/batches error:", error);
        setSchools([]);
        setAlmanacBatches([]);
        setSavedCalendars([]);
      }
    };

    fetchSchoolsAndBatches();
  }, []);

  const programCountLabel = (count) => {
    if (count === 1) {
      return "1 Programme";
    }
    return `${count} Programmes`;
  };

  const normalize = (value) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const schoolBrandPalette = [
    { matches: ["engineering"], color: "rgb(192, 34, 34)" },
    { matches: ["informatics"], color: "rgb(229, 9, 127)" },
    { matches: ["management studies", "management"], color: "rgb(12, 84, 160)" },
    { matches: ["law"], color: "rgb(43, 42, 41)" },
    { matches: ["architecture"], color: "rgb(247, 167, 7)" },
    { matches: ["psychology"], color: "rgb(123, 62, 83)" },
    { matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"], color: "rgb(236, 105, 31)" },
    { matches: ["liberal arts"], color: "rgb(137, 137, 137)" },
    { matches: ["health sciences", "health science"], color: "rgb(0, 110, 54)" },
    { matches: ["pharmacy"], color: "rgb(120, 184, 51)" },
    { matches: ["school of sciences", "school of science", "sciences"], color: "rgb(243, 156, 163)" },
    { matches: ["ph.d", "phd"], color: "rgb(50, 43, 106)" }
  ];

  const getSchoolCardPalette = (schoolName) => {
    const normalized = normalize(schoolName);

    const matched = schoolBrandPalette.find((entry) =>
      entry.matches.some((keyword) => normalized.includes(keyword))
    );
    const brand = matched?.color || "#0d4e82";

    return {
      bg: brand,
      border: brand
    };
  };

  const buildBatchOptionsForProgram = (programName) => {
    const grouped = {};

    almanacBatches.forEach((item) => {
      if (normalize(item.program) !== normalize(programName)) {
        return;
      }

      const key = `${item.batchStart}-${item.batchEnd}`;
      const existing = grouped[key];

      if (!existing) {
        grouped[key] = item;
        return;
      }

      if (new Date(item.updatedAt || 0).getTime() > new Date(existing.updatedAt || 0).getTime()) {
        grouped[key] = item;
      }
    });

    return Object.values(grouped).sort((a, b) => b.batchStart - a.batchStart);
  };

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

  const getSchoolForProgram = useCallback((programName) => {
    const school = schools.find((item) =>
      (item.programs || []).some((program) => normalize(program) === normalize(programName))
    );

    return school?.name || "School";
  }, [schools]);

  const toDateLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  };

  const goToSavedCalendarView = async (item) => {
    setCalendarError("");

    try {
      let savedCalendarData = null;

      if ((!item?.almanacId || item.almanacId === "undefined") && item?.calendarId) {
        const savedRes = await axios.get(`http://localhost:5000/api/almanac/saved-calendars/${item.calendarId}`);
        savedCalendarData = savedRes.data;
      }

      const routeAlmanacId = item?.almanacId && item.almanacId !== "undefined"
        ? item.almanacId
        : (savedCalendarData?.almanacId || item?.calendarId || "saved");

      navigate(`/academic-calendar/view/${routeAlmanacId}/${item.yearNumber}`, {
        state: {
          schoolName: item.schoolName || getSchoolForProgram(item.program),
          programName: item.program,
          readOnly: true,
          savedCalendarData
        }
      });
    } catch (error) {
      console.error("Open saved calendar error:", error);
      setCalendarError(error?.response?.data?.message || "Unable to open saved calendar.");
    }
  };

  const clearSavedFilters = () => {
    setSavedFilters({
      schoolName: "",
      programName: "",
      batchKey: ""
    });
  };

  const savedCalendarOptions = useMemo(() => {
    const schoolList = (schools || []).map((item) => item.name).sort((a, b) => a.localeCompare(b));

    const selectedSchoolRecord = (schools || []).find(
      (item) => item.name === savedFilters.schoolName
    );

    const selectedSchoolPrograms = Array.isArray(selectedSchoolRecord?.programs)
      ? selectedSchoolRecord.programs
      : [];

    const calendarsBySchool = savedFilters.schoolName
      ? savedCalendars.filter((item) => (item.schoolName || getSchoolForProgram(item.program)) === savedFilters.schoolName)
      : [];

    const programSet = new Set(selectedSchoolPrograms);

    const calendarsByProgram = savedFilters.programName
      ? calendarsBySchool.filter((item) => item.program === savedFilters.programName)
      : [];

    const batchSet = new Set();
    calendarsByProgram.forEach((item) => {
      batchSet.add(`${item.batchStart}-${item.batchEnd}`);
    });

    return {
      schools: schoolList,
      programs: Array.from(programSet).sort((a, b) => a.localeCompare(b)),
      batches: Array.from(batchSet).sort((a, b) => {
        const [aStart] = a.split("-").map(Number);
        const [bStart] = b.split("-").map(Number);
        return bStart - aStart;
      })
    };
  }, [schools, savedCalendars, savedFilters.schoolName, savedFilters.programName, getSchoolForProgram]);

  const filteredSavedCalendars = useMemo(() => {
    return savedCalendars.filter((item) => {
      const school = item.schoolName || getSchoolForProgram(item.program);
      const batchKey = `${item.batchStart}-${item.batchEnd}`;

      if (savedFilters.schoolName && school !== savedFilters.schoolName) {
        return false;
      }

      if (savedFilters.programName && item.program !== savedFilters.programName) {
        return false;
      }

      if (savedFilters.batchKey && batchKey !== savedFilters.batchKey) {
        return false;
      }

      return true;
    });
  }, [savedCalendars, savedFilters, getSchoolForProgram]);

  const downloadSavedCalendarPdf = async (item) => {
    const downloadKey = item?.calendarId || `${item.almanacId}-${item.yearNumber}`;
    setDownloadingId(downloadKey);
    setCalendarError("");

    try {
      let rows = [];

      if (item?.almanacId && item.almanacId !== "undefined") {
        const savedResponse = await axios.get(
          `http://localhost:5000/api/almanac/${item.almanacId}/year/${item.yearNumber}/day-wise-table`
        );
        rows = Array.isArray(savedResponse?.data?.rows) ? savedResponse.data.rows : [];
      } else if (item?.calendarId) {
        const savedResponse = await axios.get(
          `http://localhost:5000/api/almanac/saved-calendars/${item.calendarId}`
        );
        rows = Array.isArray(savedResponse?.data?.rows) ? savedResponse.data.rows : [];
      } else {
        setCalendarError("Unable to download: missing calendar identifiers.");
        return;
      }

      if (!rows.length) {
        setCalendarError("No saved table rows found for this calendar.");
        return;
      }

      const schoolName = item.schoolName || getSchoolForProgram(item.program);
      const totalYears = getResolvedTotalYears(item.totalYears, item.batchStart, item.batchEnd);
      const yearHeading = getAcademicYearHeading(Number(item.yearNumber), totalYears);
      const yearRange = getYearBatchRange(item.batchStart, item.yearNumber, item.batchEnd);
      const headingLines = [
        String(schoolName || "School").toUpperCase(),
        `${item.program} ${yearRange}`,
        `Academic Calendar - ${yearHeading}`
      ];

      const templateModel = buildAcademicCalendarTemplateModel({ rows });
      setDownloadTemplatePayload({
        headingLines,
        model: templateModel,
        schoolName
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });

      if (!hiddenTemplateRef.current) {
        throw new Error("Preview template mount not ready for download.");
      }

      const element = hiddenTemplateRef.current;
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `academic-calendar-${item.batchStart}-${item.batchEnd}-year-${item.yearNumber}.pdf`,
        image: { type: "png", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            ".calendarTemplateHead",
            ".templateMonthCard",
            ".calendarTemplateLegend",
            ".calendarTemplateFooterBar"
          ]
        },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" }
      };

      html2pdf().set(opt).from(element).save();
    } catch (downloadError) {
      console.error("Download calendar PDF error:", downloadError);
      setCalendarError("Unable to download calendar PDF.");
    } finally {
      setDownloadTemplatePayload(null);
      setDownloadingId("");
    }
  };

  const deleteSavedCalendar = async (item) => {
    const confirmed = window.confirm("Are you sure you want to delete this saved calendar?");
    if (!confirmed) {
      return;
    }

    setCalendarError("");
    try {
      if (item?.calendarId) {
        await axios.delete(`http://localhost:5000/api/almanac/saved-calendars/${item.calendarId}`);
      } else if (item?.almanacId && item?.yearNumber) {
        await axios.delete(`http://localhost:5000/api/almanac/${item.almanacId}/year/${item.yearNumber}/day-wise-table`);
      } else {
        setCalendarError("Unable to delete this calendar due to missing identifiers.");
        return;
      }

      setSavedCalendars((current) =>
        current.filter(
          (entry) => {
            if (item?.calendarId) {
              return entry.calendarId !== item.calendarId;
            }

            return !(entry.almanacId === item.almanacId && Number(entry.yearNumber) === Number(item.yearNumber));
          }
        )
      );
    } catch (deleteError) {
      console.error("Delete saved calendar error:", deleteError);
      setCalendarError(deleteError?.response?.data?.message || "Unable to delete saved calendar.");
    }
  };

  const openProgramSelector = (schoolName, programName) => {
    setSelectorState({
      open: true,
      schoolName,
      programName
    });
    setSelectedBatchKey("");
    setSelectedAcademicYear("");
    setCalendarError("");
  };

  const closeProgramSelector = () => {
    setSelectorState({
      open: false,
      schoolName: "",
      programName: ""
    });
    setSelectedBatchKey("");
    setSelectedAcademicYear("");
  };

  const handleContinue = async () => {
    const batchOptions = buildBatchOptionsForProgram(selectorState.programName);
    const selectedBatch = batchOptions.find(
      (item) => `${item.batchStart}-${item.batchEnd}` === selectedBatchKey
    );

    if (!selectedBatch || !selectedAcademicYear) {
      return;
    }

    if (!selectedBatch._id) {
      setCalendarError("Invalid almanac id for selected batch.");
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/api/almanac/${selectedBatch._id}`);
      const almanac = res.data;

      const yearNumber = Number(selectedAcademicYear);
      const yearData = almanac?.yearsData?.[yearNumber - 1];

      if (!yearData) {
        setCalendarError("Selected year is not available in this almanac record.");
        return;
      }

      closeProgramSelector();
      setCalendarError("");

      navigate(`/academic-calendar/view/${selectedBatch._id}/${yearNumber}`, {
        state: {
          schoolName: selectorState.schoolName,
          programName: selectorState.programName
        }
      });
    } catch (error) {
      console.error("Failed to load selected almanac:", error);
      setCalendarError("Unable to load selected almanac details.");
    }
  };

  const programBatchOptions = selectorState.programName
    ? buildBatchOptionsForProgram(selectorState.programName)
    : [];

  const selectedBatch = programBatchOptions.find(
    (item) => `${item.batchStart}-${item.batchEnd}` === selectedBatchKey
  );

  const totalYearsForSelectedBatch = Number(selectedBatch?.year || 0);
  const yearDropdown = Array.from({ length: totalYearsForSelectedBatch }, (_, index) => index + 1);

  return (
    <>
      <section className="academicCalendarShell">
      <div className="academicCalendarHeader">
        <img src="/Aurora Logo.png" alt="Aurora Logo" className="academicCalendarLogo" />
        <h1 className="academicCalendarTitle">Aurora University Academic Calendar</h1>
        <p className="academicCalendarSubtitle">
          Select a school and programme to continue with year-wise academic calendar planning.
        </p>
      </div>

      <main className="academicCalendarContent">
        <div className="calendarBackRow">
          <button
            type="button"
            className="calendarBackButton calendarTopLink calendarTopLinkBlack"
            onClick={() => navigate("/")}
          >
            <span className="calendarBackInner">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="calendarBackIcon">
                <path d="M13.9 5.3 7.2 12l6.7 6.7 1.4-1.4L10 12l5.3-5.3z" />
              </svg>
              <span>Back</span>
            </span>
          </button>
          {!showSavedCalendars && (
            <button
              type="button"
              className="calendarBackButton calendarTopLink calendarTopLinkBlue"
              onClick={() => {
                setCalendarError("");
                setShowSavedCalendars(true);
              }}
            >
              View Saved Calendars
            </button>
          )}
          {showSavedCalendars && (
            <button
              type="button"
              className="calendarBackButton calendarTopLink calendarTopLinkBlue"
              onClick={() => {
                setCalendarError("");
                setShowSavedCalendars(false);
              }}
            >
              Back To Schools And Programmes
            </button>
          )}
        </div>

        {!showSavedCalendars ? (
          <>
            <h2 className="academicSectionTitle">Schools And Programmes</h2>

            <div className="calendarSchoolGrid">
              {schools.map((school, index) => {
                const schoolPrograms = school.programs || [];
                const isExpanded = expandedSchoolId === school._id;
                const palette = getSchoolCardPalette(school.name || "");

                return (
                  <article
                    key={school._id}
                    className={`calendarSchoolCard ${isExpanded ? "expanded" : ""}`}
                    style={{
                      animationDelay: `${index * 60}ms`,
                      background: palette.bg,
                      borderColor: palette.border
                    }}
                  >
                    <button
                      className="calendarSchoolHeader"
                      onClick={() =>
                        setExpandedSchoolId((current) => (current === school._id ? "" : school._id))
                      }
                    >
                      <span className="calendarSchoolName">{school.name}</span>
                      <span className="calendarProgramCount">
                        {programCountLabel(schoolPrograms.length)}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="calendarProgrammeWrap">
                        {schoolPrograms.map((programme, programmeIndex) => (
                          <button
                            type="button"
                            className="calendarProgrammePill"
                            key={`${school._id}-${programmeIndex}`}
                            onClick={() => openProgramSelector(school.name, programme)}
                          >
                            {programme}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="academicSectionTitle">Saved Calendars</h2>

            <div className="savedFilterBar">
              <div className="savedFilterItem">
                <label htmlFor="saved-filter-school">School</label>
                <select
                  id="saved-filter-school"
                  value={savedFilters.schoolName}
                  onChange={(event) =>
                    setSavedFilters(() => ({
                      schoolName: event.target.value,
                      programName: "",
                      batchKey: ""
                    }))
                  }
                >
                  <option value="">All Schools</option>
                  {savedCalendarOptions.schools.map((schoolName) => (
                    <option key={schoolName} value={schoolName}>
                      {schoolName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="savedFilterItem">
                <label htmlFor="saved-filter-program">Programme</label>
                <select
                  id="saved-filter-program"
                  value={savedFilters.programName}
                  disabled={!savedFilters.schoolName}
                  onChange={(event) =>
                    setSavedFilters((current) => ({
                      ...current,
                      programName: event.target.value,
                      batchKey: ""
                    }))
                  }
                >
                  <option value="">Select Programme</option>
                  {savedCalendarOptions.programs.map((programName) => (
                    <option key={programName} value={programName}>
                      {programName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="savedFilterItem">
                <label htmlFor="saved-filter-batch">Batch</label>
                <select
                  id="saved-filter-batch"
                  value={savedFilters.batchKey}
                  disabled={!savedFilters.programName}
                  onChange={(event) =>
                    setSavedFilters((current) => ({
                      ...current,
                      batchKey: event.target.value
                    }))
                  }
                >
                  <option value="">Select Batch</option>
                  {savedCalendarOptions.batches.map((batchKey) => (
                    <option key={batchKey} value={batchKey}>
                      {batchKey}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" className="calendarBackButton" onClick={clearSavedFilters}>
                Clear Filters
              </button>
            </div>

            {!savedCalendars.length ? (
              <p className="calendarErrorText">No saved calendars.</p>
            ) : !filteredSavedCalendars.length ? (
              <p className="calendarErrorText">No saved calendars.</p>
            ) : (
              <div className="savedCalendarGrid">
                {filteredSavedCalendars.map((item) => {
                  const cardId = item?.calendarId || `${item.almanacId}-${item.yearNumber}`;
                  const schoolName = item.schoolName || getSchoolForProgram(item.program);
                  const palette = getSchoolCardPalette(schoolName);

                  return (
                    <article
                      key={cardId}
                      className="savedCalendarCard"
                      style={{
                        background: palette.bg,
                        borderColor: palette.border
                      }}
                    >
                      <h3>{schoolName}</h3>
                      <h4>{item.program}</h4>
                      <p>Batch: {item.batchStart}-{item.batchEnd}</p>
                      <p>Calendar: Year {item.yearNumber}</p>
                      <p>Last Updated: {toDateLabel(item.updatedAt)}</p>

                      <div className="savedCalendarActions">
                        <button
                          type="button"
                          className="savedIconButton"
                          onClick={() => goToSavedCalendarView(item)}
                          title="View calendar"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5C6.5 5 2.1 8.3 1 12c1.1 3.7 5.5 7 11 7s9.9-3.3 11-7c-1.1-3.7-5.5-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="savedIconButton"
                          onClick={() => downloadSavedCalendarPdf(item)}
                          title="Download PDF"
                          disabled={downloadingId === cardId}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 20h14v-2H5v2zM11 3h2v8h3l-4 4-4-4h3V3z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="savedIconButton delete"
                          onClick={() => deleteSavedCalendar(item)}
                          title="Delete saved calendar"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {calendarError && <p className="calendarErrorText">{calendarError}</p>}
      </main>

      {selectorState.open && (
        <div className="modalOverlay">
          <div className="modalCard academicSelectorCard">
            <h2 className="modalCenterTitle">{selectorState.programName}</h2>
            <p className="selectorSubText">{selectorState.schoolName}</p>

            <label className="modalLabel">Select Batch</label>
            <select
              value={selectedBatchKey}
              onChange={(e) => {
                setSelectedBatchKey(e.target.value);
                setSelectedAcademicYear("");
              }}
            >
              <option value="">Choose batch</option>
              {programBatchOptions.map((item) => {
                const optionKey = `${item.batchStart}-${item.batchEnd}`;
                return (
                  <option key={optionKey} value={optionKey}>
                    {item.batchStart}-{item.batchEnd}
                  </option>
                );
              })}
            </select>

            <label className="modalLabel">Select Year</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              disabled={!selectedBatchKey}
            >
              <option value="">Choose year</option>
              {yearDropdown.map((yearValue) => (
                <option key={yearValue} value={yearValue}>
                  Year {yearValue}
                </option>
              ))}
            </select>

            <div className="compactActionRow">
              <button className="compactBtn compactBtnGhost" onClick={closeProgramSelector}>Cancel</button>
              <button
                className="compactBtn compactBtnPrimary"
                onClick={handleContinue}
                disabled={!selectedBatchKey || !selectedAcademicYear}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      </section>
      {downloadTemplatePayload && (
        <div className="calendarHiddenTemplateRender" aria-hidden="true">
          <div ref={hiddenTemplateRef}>
            <AcademicCalendarTemplate
              headingLines={downloadTemplatePayload.headingLines}
              model={downloadTemplatePayload.model}
              schoolName={downloadTemplatePayload.schoolName}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
}

export default AcademicCalendarPage;
