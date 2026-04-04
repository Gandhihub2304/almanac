import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getYearLabels } from "../utils/yearLabels";
import "./Almanac.css";

function AlmanacBatchDetail() {
  const { batchStart, batchEnd } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedAlmanac, setSelectedAlmanac] = useState(null);
  const [schools, setSchools] = useState([]);

  const yearNames = getYearLabels(selectedAlmanac?.yearsData?.length).map((item) => item.toUpperCase());
  const romanTerms = ["I", "II", "III", "IV"];

  const isPostgraduateProgram = (programName) => {
    const normalized = (programName || "").toLowerCase().replace(/\s+/g, " ").trim();

    const postgraduatePrograms = [
      "m.tech",
      "mca",
      "mba",
      "m.sc (clinical psychology)",
      "m.arch",
      "llm",
      "llb",
      "m.sc yoga"
    ];

    return postgraduatePrograms.includes(normalized);
  };

  const normalize = (value) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const getSchoolForProgram = (programName) => {
    const school = schools.find((item) =>
      (item.programs || []).some((program) => normalize(program) === normalize(programName))
    );

    return school?.name || "";
  };

  const getProgramDisplayName = (programName) => {
    const normalizedProgram = normalize(programName);

    if (normalizedProgram === "b.tech" || normalizedProgram === "btech") {
      return "B.Tech CSE & Allied";
    }

    return programName || "";
  };

  useEffect(() => {
    const fetchBatchPrograms = async () => {
      try {
        const [batchesRes, schoolsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/almanac/batches"),
          axios.get("http://localhost:5000/api/schools")
        ]);

        setSchools(schoolsRes.data || []);

        const batchPrograms = (batchesRes.data || []).filter(
          (item) => item.batchStart === Number(batchStart) && item.batchEnd === Number(batchEnd)
        );

        setPrograms(batchPrograms);
        
        if (batchPrograms.length > 0) {
          setSelectedProgram(batchPrograms[0]);
        } else {
          setError("No programs found for this batch");
        }
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load batch programs");
      } finally {
        setLoading(false);
      }
    };

    fetchBatchPrograms();
  }, [batchStart, batchEnd]);

  useEffect(() => {
    if (selectedProgram && selectedProgram._id) {
      const fetchAlmanacData = async () => {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/almanac/${selectedProgram._id}`
          );
          setSelectedAlmanac(res.data);
        } catch (err) {
          console.error("Failed to load almanac:", err);
          setSelectedAlmanac(null);
        }
      };

      fetchAlmanacData();
    }
  }, [selectedProgram]);

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
    const activities = (term?.activities && term.activities.length > 0)
      ? term.activities
      : [{ start: term?.activityStart, end: term?.activityEnd }];

    const ranges = activities
      .filter((item) => item?.start && item?.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  if (loading) {
    return <h3 className="previewStatus">Loading batch programs...</h3>;
  }

  if (error || programs.length === 0) {
    return (
      <div className="viewPageShell">
        <h3 className="previewStatus">{error || "No programs found"}</h3>
        <button className="previewBtn" onClick={() => navigate("/")}>
          Go Home
        </button>
      </div>
    );
  }

  const schoolName = getSchoolForProgram(selectedAlmanac?.program);
  const isEngineeringSchool = normalize(schoolName).includes("engineering");
  const batchLabel = `${selectedAlmanac?.batchStart}-${selectedAlmanac?.batchEnd}`;
  const programDisplayName = getProgramDisplayName(selectedAlmanac?.program);
  const bannerTitle = isEngineeringSchool
    ? `${batchLabel} Batch ${programDisplayName} Programme Almanac`
    : `${batchLabel} Batch ${isPostgraduateProgram(selectedAlmanac?.program) ? "Postgraduate" : "Undergraduate"} ${programDisplayName} Programme Almanac`;

  return (
    <div className="viewPageShell">
      <div className="viewActions">
        <button className="previewBtn" onClick={() => navigate("/")}>
          Back
        </button>
        <button className="saveBtn" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {/* Batch Title & Program Links */}
      <div className="batchDetailContainer">
        <h2 className="batchDetailTitle">
          {batchStart}-{batchEnd} Batch
        </h2>

        <div className="programLinksContainer">
          {programs.map((prog) => (
            <button
              key={prog._id}
              className={`programLink ${selectedProgram?._id === prog._id ? "active" : ""}`}
              onClick={() => setSelectedProgram(prog)}
            >
              {prog.program}
            </button>
          ))}
        </div>
      </div>

      {/* Almanac Table for Selected Program */}
      {selectedAlmanac && (
        <div className="previewPaper batchViewPaper">
          <div className="previewHeaderBar">
            <div className="previewHeaderLeft">
              <img src="/text.jpeg" alt="Aurora University text" className="previewTextLogo" />
            </div>

            <img src="/Aurora Logo.png" alt="Aurora emblem" className="previewTopLogo previewTopLogoRight" />
          </div>

          <div className="previewSchoolTitle">{(schoolName || "School").toUpperCase()}</div>

          <div className={`previewBanner ${isEngineeringSchool ? "engineeringTheme" : ""}`}>
            {bannerTitle}
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
                {(selectedAlmanac.yearsData || []).map((yearItem, yIndex) => (
                  (yearItem.terms || []).map((term, tIndex) => (
                    <tr className={`yearBand yearBand${yIndex}`} key={`${yIndex}-${tIndex}`}>
                      {tIndex === 0 && (
                        <td className="previewYearCell" rowSpan={(yearItem.terms || []).length}>
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
                      <td>{toRange(term.assessmentStart, term.assessmentEnd)}</td>
                      <td>{toRange(term.breakStart, term.breakEnd)}</td>
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

          <div className={`previewFooterBar ${isEngineeringSchool ? "engineeringTheme" : ""}`}>
            Uppal, Hyderabad - 500098. Telangana, aurora.edu.in
          </div>
        </div>
      )}
    </div>
  );
}

export default AlmanacBatchDetail;
