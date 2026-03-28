import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  isMonday,
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

  const showWarningModal = (msg) => {
    setWarningMessage(msg);
    setShowWarning(true);
  };

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

  const isFinalYear = (yearIndex) => yearIndex === yearsData.length - 1;
  const isNoBreakTerm = (yearIndex, termIndex) => (
    termIndex === 2 || (isFinalYear(yearIndex) && termIndex === 3)
  );
  const isManualBreakTerm = (yearIndex, termIndex) => (
    !isFinalYear(yearIndex) && termIndex === 3
  );
  const invalidDateMessage = "❌ This date is invalid";

  const getPreviousTermRef = (yearIndex, termIndex) => {
    if (termIndex > 0) {
      return { yearIndex, termIndex: termIndex - 1 };
    }
    if (yearIndex > 0) {
      return { yearIndex: yearIndex - 1, termIndex: 3 };
    }
    return null;
  };

  const getNextTermRef = (yearIndex, termIndex) => {
    if (termIndex < 3) {
      return { yearIndex, termIndex: termIndex + 1 };
    }
    if (yearIndex < yearsData.length - 1) {
      return { yearIndex: yearIndex + 1, termIndex: 0 };
    }
    return null;
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

  const isSelfStartInStrictSequence = (data, yearIndex, termIndex, selfStartDate) => {
    const previousRef = getPreviousTermRef(yearIndex, termIndex);
    if (!previousRef) return true;

    const previousTerm = data[previousRef.yearIndex]?.terms?.[previousRef.termIndex];
    if (!previousTerm) return true;

    if (previousTerm.breakStart || previousTerm.breakEnd) {
      if (!previousTerm.breakStart || !previousTerm.breakEnd) {
        return false;
      }

      const expectedStartAfterBreak = toIso(getNextMonday(new Date(previousTerm.breakEnd)));
      return selfStartDate === expectedStartAfterBreak;
    }

    if (previousTerm.assessmentEnd) {
      const expectedStart = toIso(getNextMonday(new Date(previousTerm.assessmentEnd)));
      return selfStartDate === expectedStart;
    }

    return true;
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

  // ✅ SELF START
  const handleSelfStart = (y, t, value) => {
    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
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

    const duplicateSelfStart = yearsData.some((yearItem, yearIndex) =>
      yearItem.terms.some((termItem, termIndex) =>
        !(yearIndex === y && termIndex === t) && termItem.selfStart === value
      )
    );

    if (duplicateSelfStart) {
      showWarningModal("❌ This date is already declared");
      return;
    }

    if (!isSelfStartInStrictSequence(yearsData, y, t, value)) {
      showWarningModal(invalidDateMessage);
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

    calculateTerm(updated, y, t);
    setYearsData(updated);
  };

  // ✅ ACTIVITY
  const handleActivity = (y, t, value) => {
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

    let updated = [...yearsData];
    let term = updated[y].terms[t];

    if (!term.selfStart || !term.termStart) {
      showWarningModal(invalidDateMessage);
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

    term.activityStart = value;

    let end = new Date(value);
    end.setDate(end.getDate() + 6);
    term.activityEnd = end.toISOString().split("T")[0];

    calculateTerm(updated, y, t);
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

    let updated = [...yearsData];
    let term = updated[y].terms[t];
    let holiday = term.holidays[h];

    // Strict sequence validation: holiday must belong to the active term window.
    if (!term.selfStart || !term.termStart) {
      showWarningModal(invalidDateMessage);
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
    if (
      term.activityStart &&
      term.activityEnd &&
      isWeekOverlap(value, holidayEnd, term.activityStart, term.activityEnd)
    ) {
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

    let end = new Date(value);
    end.setDate(end.getDate() + 6);
    holiday.end = end.toISOString().split("T")[0];

    calculateTerm(updated, y, t);
    setYearsData(updated);
  };

  const addHoliday = (y, t) => {
    let updated = [...yearsData];
    updated[y].terms[t].holidays.push({ start: "", end: "" });
    setYearsData(updated);
  };

  // 🔥 CALCULATION
  const calculateTerm = (updatedData, yearIndex, termIndex) => {
    const term = updatedData[yearIndex].terms[termIndex];
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

    if (isNoBreakTerm(yearIndex, termIndex)) {
      term.breakStart = "";
      term.breakEnd = "";
      return;
    }

    if (isManualBreakTerm(yearIndex, termIndex)) {
      return;
    }

    const breakStart = getNextMonday(assessEnd);
    const breakEnd = addWeeks(breakStart, 1);
    breakEnd.setDate(breakEnd.getDate() - 1);

    term.breakStart = breakStart.toISOString().split("T")[0];
    term.breakEnd = breakEnd.toISOString().split("T")[0];
  };

  const handleManualBreak = (y, t, field, value) => {
    if (!batchStart || !batchEnd) {
      showWarningModal("❌ Please set Batch Start and End first");
      return;
    }

    if (!isDateWithinBatchRange(value)) {
      showWarningModal(`❌ Date must be between ${batchStart} and ${batchEnd}`);
      return;
    }

    let updated = [...yearsData];
    let term = updated[y].terms[t];

    term[field] = value;

    if (!term.selfStart || !term.assessmentEnd) {
      showWarningModal(invalidDateMessage);
      term[field] = "";
      setYearsData(updated);
      return;
    }

    if (term.breakStart && term.breakStart < term.selfStart) {
      showWarningModal(invalidDateMessage);
      term[field] = "";
      setYearsData(updated);
      return;
    }

    if (term.breakEnd && term.breakEnd < term.selfStart) {
      showWarningModal(invalidDateMessage);
      term[field] = "";
      setYearsData(updated);
      return;
    }

    if (term.breakStart && term.assessmentEnd) {
      const minBreakStart = toIso(getNextMonday(new Date(term.assessmentEnd)));
      if (term.breakStart < minBreakStart) {
        showWarningModal(invalidDateMessage);
        term[field] = "";
        setYearsData(updated);
        return;
      }
    }

    if (term.breakEnd && term.assessmentEnd && term.breakEnd <= term.assessmentEnd) {
      showWarningModal(invalidDateMessage);
      term[field] = "";
      setYearsData(updated);
      return;
    }

    if (term.breakStart && term.breakEnd) {
      if (!isMonday(term.breakStart)) {
        showWarningModal("❌ Break must start on Monday");
        term[field] = "";
        setYearsData(updated);
        return;
      }

      const breakEndDate = new Date(term.breakEnd);
      if (breakEndDate.getDay() !== 0) {
        showWarningModal("❌ Break must end on Sunday");
        term[field] = "";
        setYearsData(updated);
        return;
      }

      const duration = getDurationInDays(term.breakStart, term.breakEnd);

      if (duration <= 0) {
        showWarningModal("❌ Break end cannot be before break start");
        term[field] = "";
        setYearsData(updated);
        return;
      }

      if (duration > 21) {
        showWarningModal("⚠️ Break cannot be more than 3 weeks");
        term[field] = "";
        setYearsData(updated);
        return;
      }

      const nextRef = getNextTermRef(y, t);
      if (nextRef) {
        const nextTerm = updated[nextRef.yearIndex]?.terms?.[nextRef.termIndex];
        const expectedNextSelfStart = toIso(getNextMonday(new Date(term.breakEnd)));

        if (nextTerm?.selfStart && nextTerm.selfStart !== expectedNextSelfStart) {
          showWarningModal(invalidDateMessage);
          term[field] = "";
          setYearsData(updated);
          return;
        }
      }
    }

    setYearsData(updated);
  };

  const validateBreakRules = () => {
    for (let y = 0; y < yearsData.length; y += 1) {
      const termThree = yearsData[y]?.terms?.[2];
      const termFour = yearsData[y]?.terms?.[3];

      if (termThree?.breakStart || termThree?.breakEnd) {
        showWarningModal(`Year ${y + 1} Term 3 must not have break`);
        return false;
      }

      if (isFinalYear(y)) {
        if (termFour?.breakStart || termFour?.breakEnd) {
          showWarningModal(`Final year Term 4 must not have break`);
          return false;
        }
        continue;
      }

      if (!termFour?.breakStart || !termFour?.breakEnd) {
        showWarningModal(`Set Year ${y + 1} Term 4 break manually`);
        return false;
      }

      if (!termFour?.selfStart || !termFour?.assessmentEnd) {
        showWarningModal(invalidDateMessage);
        return false;
      }

      if (termFour.breakStart < termFour.selfStart || termFour.breakEnd < termFour.selfStart) {
        showWarningModal(invalidDateMessage);
        return false;
      }

      const termFourMinBreakStart = toIso(getNextMonday(new Date(termFour.assessmentEnd)));
      if (termFour.breakStart < termFourMinBreakStart || termFour.breakEnd <= termFour.assessmentEnd) {
        showWarningModal(invalidDateMessage);
        return false;
      }

      const duration = getDurationInDays(termFour.breakStart, termFour.breakEnd);
      if (duration <= 0 || duration > 21) {
        showWarningModal(`Year ${y + 1} Term 4 break must be between 1 and 21 days`);
        return false;
      }
    }

    for (let y = 0; y < yearsData.length; y += 1) {
      for (let t = 0; t < 4; t += 1) {
        const current = yearsData[y]?.terms?.[t];
        if (!current) continue;

        if (current.selfStart && !isSelfStartInStrictSequence(yearsData, y, t, current.selfStart)) {
          showWarningModal(invalidDateMessage);
          return false;
        }

        if (current.termStart && current.selfEnd) {
          const expectedTermStart = toIso(getNextMonday(new Date(current.selfEnd)));
          if (current.termStart !== expectedTermStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }
        }

        if (current.activityStart) {
          if (!current.termStart || current.activityStart < current.termStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }
          if (current.assessmentStart && current.activityStart >= current.assessmentStart) {
            showWarningModal(invalidDateMessage);
            return false;
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
        }

        if (current.breakStart && current.assessmentEnd) {
          const minBreakStart = toIso(getNextMonday(new Date(current.assessmentEnd)));
          if (current.breakStart < minBreakStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }
        }

        const nextRef = getNextTermRef(y, t);
        if (nextRef) {
          const nextTerm = yearsData[nextRef.yearIndex]?.terms?.[nextRef.termIndex];
          if (current.breakStart && current.breakEnd && nextTerm?.selfStart) {
            const expectedNextSelfStart = toIso(getNextMonday(new Date(current.breakEnd)));
            if (expectedNextSelfStart !== nextTerm.selfStart) {
              showWarningModal(invalidDateMessage);
              return false;
            }
          }

          if ((current.breakStart || current.breakEnd) && (!current.breakStart || !current.breakEnd) && nextTerm?.selfStart) {
            showWarningModal(invalidDateMessage);
            return false;
          }
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
      const response = await axios.post("http://localhost:5000/api/almanac", {
        program,
        year,
        batchStart: parsedBatchStart,
        batchEnd: parsedBatchEnd,
        yearsData
      });

      showWarningModal(`${response.data.message} ✅`);
    } catch (error) {
      console.error(error);
      const backendMessage = error?.response?.data?.message;
      showWarningModal(backendMessage ? `Save Failed ❌\n${backendMessage}` : "Save Failed ❌");
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
                      <input type="date" value={t.assessmentStart} readOnly />
                      <input type="date" value={t.assessmentEnd} readOnly />
                    </td>

                    <td>
                      {isNoBreakTerm(yIndex, tIndex) ? (
                        <span className="noBreakText">No Break</span>
                      ) : isManualBreakTerm(yIndex, tIndex) ? (
                        <>
                          <input
                            type="date"
                            value={t.breakStart}
                            onChange={(e) => handleManualBreak(yIndex, tIndex, "breakStart", e.target.value)}
                          />
                          <input
                            type="date"
                            value={t.breakEnd}
                            onChange={(e) => handleManualBreak(yIndex, tIndex, "breakEnd", e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <input type="date" value={t.breakStart} readOnly />
                          <input type="date" value={t.breakEnd} readOnly />
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