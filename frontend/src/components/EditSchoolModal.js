import { useState } from "react";
import axios from "axios";
import "./Modal.css";

function EditSchoolModal({ schools, close, refresh }) {
  const [selected, setSelected] = useState(null);
  const [newProgram, setNewProgram] = useState("");

  // 🗑️ DELETE SCHOOL
  const deleteSchool = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/schools/${id}`);
      refresh();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // 💾 UPDATE SCHOOL
  const updateSchool = async () => {
    try {
      console.log("Updating ID:", selected?._id);

      if (!selected || !selected._id) {
        alert("ID missing ❌");
        return;
      }

      const res = await axios.put(
        `http://localhost:5000/api/schools/${selected._id}`,
        {
          name: selected.name,
          programs: selected.programs
        }
      );

      console.log("Updated:", res.data);

      refresh();
      setSelected(null);

    } catch (error) {
      console.error("Update Error:", error);
      alert("Update failed ❌");
    }
  };

  // ➕ ADD PROGRAM
  const addProgram = () => {
    if (newProgram.trim() === "") return;

    setSelected((prev) => ({
      ...prev,
      programs: [...prev.programs, newProgram]
    }));

    setNewProgram("");
  };

  // ❌ DELETE PROGRAM
  const deleteProgram = (index) => {
    setSelected((prev) => ({
      ...prev,
      programs: prev.programs.filter((_, i) => i !== index)
    }));
  };

  // ✏️ EDIT PROGRAM
  const editProgram = (value, index) => {
    setSelected((prev) => {
      const updated = [...prev.programs];
      updated[index] = value;
      return { ...prev, programs: updated };
    });
  };

  return (
    <div className="modalOverlay">
      <div className="modalCard">
        <h2>Edit Schools</h2>

        {/* 🔹 LIST VIEW */}
        {!selected ? (
          <>
            {schools.map((s) => (
              <div key={s._id} className="editRow">
                <span>{s.name}</span>

                <div className="iconActions">
                  <button
                    className="inlineBtn iconBtn edit"
                    onClick={() => setSelected({ ...s })}
                    aria-label="Edit school"
                    title="Edit"
                  >
                    ✏
                  </button>

                  <button
                    className="inlineBtn iconBtn delete"
                    onClick={() => deleteSchool(s._id)}
                    aria-label="Delete school"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* ✏️ EDIT SCHOOL NAME */}
            <input
              type="text"
              value={selected.name}
              onChange={(e) =>
                setSelected((prev) => ({
                  ...prev,
                  name: e.target.value
                }))
              }
              placeholder="School Name"
            />

            <h4>Programs</h4>

            {/* 🔹 PROGRAM LIST */}
            {selected.programs.map((p, i) => (
              <div key={i} className="editRow">
                <input
                  value={p}
                  onChange={(e) => editProgram(e.target.value, i)}
                />

                <button className="inlineBtn delete" onClick={() => deleteProgram(i)}>Remove</button>
              </div>
            ))}

            {/* ➕ ADD PROGRAM */}
            <div className="programRow">
              <input
                type="text"
                placeholder="New Program"
                value={newProgram}
                onChange={(e) => setNewProgram(e.target.value)}
              />
              <button className="inlineBtn add" onClick={addProgram}>Add</button>
            </div>

            <div className="actionLinksRow">
              <button className="textActionLink textOk" onClick={updateSchool}>
                Save Changes
              </button>
              <button className="textActionLink textCancel" onClick={close}>
                Close
              </button>
            </div>
          </>
        )}

        {!selected && (
          <div className="actionLinksRow">
            <button className="textActionLink textCancel" onClick={close}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditSchoolModal;