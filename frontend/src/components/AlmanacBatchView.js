import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getYearLabels } from "../utils/yearLabels";
import "./Almanac.css";

function AlmanacBatchView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [almanac, setAlmanac] = useState(null);
  const [schools, setSchools] = useState([]);

  const yearNames = getYearLabels(almanac?.yearsData?.length).map((item) => item.toUpperCase());
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

  const getSchoolBrandColor = (name) => {
    const normalized = normalize(name);
    const matched = schoolBrandPalette.find((entry) =>
      entry.matches.some((keyword) => normalized.includes(keyword))
    );

    return matched?.color || "#4d5660";
  };

  const getContrastTextColor = (rgbColor) => {
    const values = String(rgbColor || "")
      .replace(/[^0-9,]/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));

    if (values.length < 3) {
      return "#ffffff";
    }

    const [r, g, b] = values;
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance > 170 ? "#1b1b1b" : "#ffffff";
  };

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
    const fetchAlmanac = async () => {
      try {
        const [almanacRes, schoolsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/almanac/${id}`),
          axios.get("http://localhost:5000/api/schools")
        ]);

        setAlmanac(almanacRes.data);
        setSchools(schoolsRes.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load almanac");
      } finally {
        setLoading(false);
      }
    };

    fetchAlmanac();
  }, [id]);

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

  const getAssessmentRange = (term, termIndex) => {
    if (termIndex === 3) {
      return "-";
    }

    return toRange(term.assessmentStart, term.assessmentEnd);
  };

  if (loading) {
    return <h3 className="previewStatus">Loading almanac...</h3>;
  }

  if (error || !almanac) {
    return (
      <div className="viewPageShell">
        <h3 className="previewStatus">{error || "Almanac not found"}</h3>
        <button className="previewBtn" onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const schoolName = getSchoolForProgram(almanac.program);
  const brandColor = getSchoolBrandColor(schoolName);
  const brandTextColor = getContrastTextColor(brandColor);
  const batchLabel = `${almanac.batchStart}-${almanac.batchEnd}`;
  const programDisplayName = getProgramDisplayName(almanac.program);
  const bannerTitle = `${batchLabel} Batch ${isPostgraduateProgram(almanac.program) ? "Postgraduate" : "Undergraduate"} ${programDisplayName} Programme Almanac`;

  return (
    <div className="viewPageShell">
      <div className="viewActions">
        <button className="previewBtn" onClick={() => navigate("/")}>Back</button>
        <button className="saveBtn" onClick={() => window.print()}>Print</button>
      </div>

      <div
        className="previewPaper batchViewPaper"
        style={{
          "--preview-brand-color": brandColor,
          "--preview-brand-text": brandTextColor
        }}
      >
        <div className="previewHeaderBar">
          <div className="previewHeaderLeft">
            <img src="/text.jpeg" alt="Aurora University text" className="previewTextLogo" />
          </div>

          <img src="/Aurora Logo.png" alt="Aurora emblem" className="previewTopLogo previewTopLogoRight" />
        </div>

        <div className="previewSchoolTitle">{(schoolName || "School").toUpperCase()}</div>

        <div className="previewBanner">
          {bannerTitle}
        </div>

        <div className="previewTableWrap previewTableWrapWithGap">
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
              {(almanac.yearsData || []).map((yearItem, yIndex) => (
                (yearItem.terms || []).map((term, tIndex) => (
                  <tr className={`yearBand yearBand${yIndex}`} key={`${yIndex}-${tIndex}`}>
                    {tIndex === 0 && (
                      <td className="previewYearCell" rowSpan={(yearItem.terms || []).length}>
                        {yearNames[yIndex] || `YEAR ${yIndex + 1}`}
                      </td>
                    )}

                    <td>{romanTerms[tIndex] || term.termNumber}</td>
                    <td>{toDisplayDate(term.selfStart)}</td>
                    <td>{toDisplayDate(term.selfEnd)}</td>
                    <td>{toDisplayDate(term.termStart)}</td>
                    <td>{toDisplayDate(term.termEnd)}</td>
                    <td>{getActivityRange(term)}</td>
                    <td>{getHolidayRange(term.holidays)}</td>
                    <td>{getAssessmentRange(term, tIndex)}</td>
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

        <div className="previewFooterBar">
          Uppal, Hyderabad - 500098. Telangana, aurora.edu.in
        </div>
      </div>
    </div>
  );
}

export default AlmanacBatchView;