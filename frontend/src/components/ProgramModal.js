import { useState } from "react";
import YearModal from "./YearModal";
import "./Modal.css";

function ProgramModal({ school, close }) {
  const [program, setProgram] = useState(null);
  const schoolName = typeof school === "string" ? school : school?.name;
  const programList = typeof school === "string" ? [] : school?.programs || [];

  return (
    <>
      <div className="modalOverlay">
        <div className="modalCard">
          <h2>{schoolName}</h2>

          {programList.map((p, i) => (
            <button key={i} className="modalBtn" onClick={() => setProgram(p)}>
              {p}
            </button>
          ))}

          <button className="closeBtn" onClick={close}>Close</button>
        </div>
      </div>

      {program && <YearModal program={program} closeProgramModal={close} />}
    </>
  );
}

export default ProgramModal;