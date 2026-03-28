import { useState } from "react";
import axios from "axios";
import "./Modal.css";

function AddSchoolModal({ close, refresh }) {
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [programs, setPrograms] = useState([]);

  const add = () => {
    if (!program.trim()) return;
    setPrograms([...programs, program]);
    setProgram("");
  };

  const save = async () => {
    if (!name.trim() || programs.length === 0) {
      alert("Enter school name and add at least one programme");
      return;
    }

    await axios.post("http://localhost:5000/api/schools", { name, programs });
    refresh();
    close();
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard addSchoolCard">
        <h2 className="modalCenterTitle">Add School</h2>

        <label className="modalLabel">School Name</label>
        <input
          placeholder="Enter school name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="modalLabel">Programmes</label>
        <div className="programInputRow">
          <input
            placeholder="Add one programme"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
          <button className="textActionLink textAdd" onClick={add}>Add</button>
        </div>

        {programs.length > 0 && (
          <div className="programChips">
            {programs.map((p, i) => (
              <span className="programChip" key={i}>{p}</span>
            ))}
          </div>
        )}

        <div className="actionLinksRow">
          <button className="textActionLink textOk" onClick={save}>OK</button>
          <button className="textActionLink textCancel" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default AddSchoolModal;