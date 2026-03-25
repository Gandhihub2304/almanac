import { useState } from "react";
import axios from "axios";
import "./Modal.css";

function AddSchoolModal({ close, refresh }) {
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [programs, setPrograms] = useState([]);

  const add = () => {
    setPrograms([...programs, program]);
    setProgram("");
  };

  const save = async () => {
    await axios.post("http://localhost:5000/api/schools", { name, programs });
    refresh();
    close();
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>Add School</h2>

        <input placeholder="School name" onChange={(e)=>setName(e.target.value)} />

        <input
          placeholder="Program name"
          value={program}
          onChange={(e)=>setProgram(e.target.value)}
        />
        <button className="inlineBtn add" onClick={add}>Add Program</button>

        {programs.length > 0 && (
          <div className="programChips">
            {programs.map((p, i) => (
              <span className="programChip" key={i}>{p}</span>
            ))}
          </div>
        )}

        <button className="modalBtn" onClick={save}>OK</button>
        <button className="closeBtn" onClick={close}>Cancel</button>
      </div>
    </div>
  );
}

export default AddSchoolModal;