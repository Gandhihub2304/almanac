import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Modal.css";

function YearModal({ program, closeProgramModal }) {
  const [year, setYear] = useState("");
  const navigate = useNavigate();

  const handle = () => {
    if (!year) {
      alert("Please select year ❌");
      return;
    }

    closeProgramModal();

    navigate("/almanac", {
      state: {
        program,
        year: Number(year)   // 🔥 convert to number
      }
    });
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>{program}</h2>

        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Select Year</option>
          {[1,2,3,4].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <button className="modalBtn" onClick={handle}>
          OK
        </button>
      </div>
    </div>
  );
}

export default YearModal;