import { useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  isMonday,
  getNextMonday,
  addWeeks
} from "../utils/dateUtils";
import "./Almanac.css";

function AlmanacForm() {

  const location = useLocation();
  const { program, year } = location.state || {};

  const yearNames = ["Freshman", "Sophomore", "Junior", "Senior"];

  // 🔥 NEW: BATCH STATES
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // 🔥 CREATE TERM
  const createTerm = (termNumber) => ({
    termNumber,
    selfStart: "",
    selfEnd: "",
    termStart: "",
    termEnd: "",
    activityStart: "",
    activityEnd: "",
    holidays: [{ start: "", end: "" }],
    assessmentStart: "",
    assessmentEnd: "",
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

  if (!year) {
    return <h2 style={{ textAlign: "center" }}>No Year Selected ❌</h2>;
  }

  // ✅ SELF START
  const handleSelfStart = (y, t, value) => {
    if (!isMonday(value)) {
      alert("❌ Only Monday allowed");
      return;
    }

    let updated = [...yearsData];
    let term = updated[y].terms[t];

    term.selfStart = value;

    let end = new Date(value);
    end.setDate(end.getDate() + 6);
    term.selfEnd = end.toISOString().split("T")[0];

    const nextMon = getNextMonday(end);
    term.termStart = nextMon.toISOString().split("T")[0];

    calculateTerm(term);
    setYearsData(updated);
  };

  // ✅ ACTIVITY
  const handleActivity = (y, t, value) => {
    if (!isMonday(value)) {
      alert("❌ Activity must start Monday");
      return;
    }

    let updated = [...yearsData];
    let term = updated[y].terms[t];

    term.activityStart = value;

    let end = new Date(value);
    end.setDate(end.getDate() + 6);
    term.activityEnd = end.toISOString().split("T")[0];

    calculateTerm(term);
    setYearsData(updated);
  };

  // ✅ HOLIDAY
  const handleHoliday = (y, t, h, value) => {
    if (!isMonday(value)) {
      alert("❌ Holiday must start Monday");
      return;
    }

    let updated = [...yearsData];
    let holiday = updated[y].terms[t].holidays[h];

    holiday.start = value;

    let end = new Date(value);
    end.setDate(end.getDate() + 6);
    holiday.end = end.toISOString().split("T")[0];

    calculateTerm(updated[y].terms[t]);
    setYearsData(updated);
  };

  const addHoliday = (y, t) => {
    let updated = [...yearsData];
    updated[y].terms[t].holidays.push({ start: "", end: "" });
    setYearsData(updated);
  };

  // 🔥 CALCULATION
  const calculateTerm = (term) => {
    let weeks = 10;

    if (term.activityStart) weeks += 1;

    const holidayCount = term.holidays.filter(h => h.start).length;
    weeks += holidayCount;

    let end = addWeeks(term.termStart, weeks);
    end.setDate(end.getDate() - 1);

    term.termEnd = end.toISOString().split("T")[0];

    const assessStart = getNextMonday(end);
    const assessEnd = addWeeks(assessStart, 1);
    assessEnd.setDate(assessEnd.getDate() - 1);

    term.assessmentStart = assessStart.toISOString().split("T")[0];
    term.assessmentEnd = assessEnd.toISOString().split("T")[0];

    const breakStart = getNextMonday(assessEnd);
    const breakEnd = addWeeks(breakStart, 1);
    breakEnd.setDate(breakEnd.getDate() - 1);

    term.breakStart = breakStart.toISOString().split("T")[0];
    term.breakEnd = breakEnd.toISOString().split("T")[0];
  };

  // 💾 SAVE WITH BATCH
  const handleSave = async () => {
    if (!batchStart || !batchEnd) {
      alert("Enter Batch Start and End ❌");
      return;
    }

    const parsedBatchStart = Number(batchStart);
    const parsedBatchEnd = Number(batchEnd);

    if (Number.isNaN(parsedBatchStart) || Number.isNaN(parsedBatchEnd)) {
      alert("Batch values must be numbers ❌");
      return;
    }

  
    if (parsedBatchEnd < parsedBatchStart) {
      alert("Batch End cannot be less than Batch Start ❌");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/almanac", {
        program,
        year,
        batchStart: parsedBatchStart,
        batchEnd: parsedBatchEnd,
        yearsData
      });

      alert(`${response.data.message} ✅`);
    } catch (error) {
      console.error(error);
      const backendMessage = error?.response?.data?.message;
      alert(backendMessage ? `Save Failed ❌\n${backendMessage}` : "Save Failed ❌");
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

  const romanTerms = ["I", "II", "III", "IV"];

  return (
    <div className="almanacContainer">

      {/* 🔥 HEADER */}
      <div className="headerRow">
        <h2 className="pageTitle">{program} Almanac</h2>

        <span className="batchText">
          {batchStart && batchEnd
            ? `${batchStart} - ${batchEnd} Batch`
            : "Enter Batch ➜"}
        </span>
      </div>

      {/* 🔥 BATCH INPUT */}
      <div className="batchControls">
        <input
          type="number"
          placeholder="Batch Start (e.g. 2023)"
          value={batchStart}
          onChange={(e) => setBatchStart(e.target.value)}
        />

        <input
          type="number"
          placeholder="Batch End (e.g. 2025)"
          value={batchEnd}
          onChange={(e) => setBatchEnd(e.target.value)}
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
                  <th>Self Registration</th>
                  <th>Term Duration</th>
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
                        onChange={(e)=>handleSelfStart(yIndex,tIndex,e.target.value)}
                      />
                      <input type="date" value={t.selfEnd} readOnly />
                    </td>

                    <td>
                      <input type="date" value={t.termStart} readOnly />
                      <input type="date" value={t.termEnd} readOnly />
                    </td>

                    <td>
                      <input type="date"
                        onChange={(e)=>handleActivity(yIndex,tIndex,e.target.value)}
                      />
                      <input type="date" value={t.activityEnd} readOnly />
                    </td>

                    <td>
                      {t.holidays.map((h, hi) => (
                        <div className="holidayRow" key={hi}>
                          <input type="date"
                            onChange={(e)=>handleHoliday(yIndex,tIndex,hi,e.target.value)}
                          />
                          <input type="date" value={h.end} readOnly />
                        </div>
                      ))}
                      <button className="plusBtn" onClick={()=>addHoliday(yIndex,tIndex)}>+ Holiday</button>
                    </td>

                    <td>
                      <input type="date" value={t.assessmentStart} readOnly />
                      <input type="date" value={t.assessmentEnd} readOnly />
                    </td>

                    <td>
                      <input type="date" value={t.breakStart} readOnly />
                      <input type="date" value={t.breakEnd} readOnly />
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
              <div className="previewBanner">
                {batchStart && batchEnd
                  ? `${batchStart}-${batchEnd} Batch Undergraduate ${program} Programme Almanac`
                  : `Undergraduate ${program} Programme Almanac`}
              </div>

              <div className="previewTableWrap">
                <table className="previewTable">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Term</th>
                      <th>Self Registration</th>
                      <th>Term Duration</th>
                      <th>Student Led Activities</th>
                      <th>Festival Holidays</th>
                      <th>Comprehensive Assessment</th>
                      <th>Break</th>
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
                          <td>{toRange(term.selfStart, term.selfEnd)}</td>
                          <td>{toRange(term.termStart, term.termEnd)}</td>
                          <td>{toRange(term.activityStart, term.activityEnd)}</td>
                          <td>{getHolidayRange(term.holidays)}</td>
                          <td>{toRange(term.assessmentStart, term.assessmentEnd)}</td>
                          <td>{toRange(term.breakStart, term.breakEnd)}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlmanacForm;