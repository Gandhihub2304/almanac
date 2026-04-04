import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { YEAR_OPTIONS } from "../utils/yearLabels";
import "./Modal.css";

function ProgramModal({ school, close }) {
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [year, setYear] = useState("");
  const schoolName = typeof school === "string" ? school : school?.name;
  const programList = typeof school === "string" ? [] : school?.programs || [];

  const handleYearPick = () => {
    if (!program || !year) {
      return;
    }

    close();
    navigate("/almanac", {
      state: {
        program,
        year: Number(year)
      }
    });
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard selectionFlowCard">
        <h2 className="modalCenterTitle">{schoolName}</h2>

        {!program && (
          <>
            <h4>Select Programme</h4>
            <div className="selectionGrid">
              {programList.map((item, i) => (
                <button
                  key={i}
                  className={`selectionCard ${program === item ? "active" : ""}`}
                  onClick={() => {
                    setProgram(item);
                    setYear("");
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        {program && (
          <>
            <div className="selectedProgramRow">
              <span className="selectedProgramLabel">Selected Programme: {program}</span>
              <button
                className="compactBtn compactBtnGhost compactBtnTiny"
                onClick={() => {
                  setProgram(null);
                  setYear("");
                }}
              >
                Change
              </button>
            </div>
            <h4 className="yearBlockTitle">Select Duration</h4>
            <div className="yearSelectWrap">
              <select
                className="yearSelectDropdown"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Choose year</option>
                {YEAR_OPTIONS.map((yearValue) => (
                  <option key={yearValue} value={yearValue}>
                    {`${yearValue} year${yearValue > 1 ? "s" : ""}`}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="compactActionRow">
          <button className="compactBtn compactBtnGhost" onClick={close}>Cancel</button>
          <button
            className="compactBtn compactBtnPrimary"
            onClick={handleYearPick}
            disabled={!program || !year}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProgramModal;