import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ProgramModal from "./ProgramModal";
import "./Header.css";

function Header() {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const [schools, setSchools] = useState([]);
  const [activePanel, setActivePanel] = useState("home");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [headerOffset, setHeaderOffset] = useState(116);
  const [batches, setBatches] = useState([]);
  const [batchFetchError, setBatchFetchError] = useState("");
  const [addSchoolName, setAddSchoolName] = useState("");
  const [addProgramInput, setAddProgramInput] = useState("");
  const [addPrograms, setAddPrograms] = useState([]);
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editPrograms, setEditPrograms] = useState([]);
  const [editProgramInput, setEditProgramInput] = useState("");

  const schoolCardPalette = [
    { bg: "#f1f8ff", border: "#bddaf5" },
    { bg: "#f3fbf4", border: "#c4e7c9" },
    { bg: "#fff8ef", border: "#f0d4af" },
    { bg: "#f8f5ff", border: "#d4c9f3" },
    { bg: "#eefcfa", border: "#bee7e0" },
    { bg: "#fff3f6", border: "#e9c3cf" }
  ];

  const fetchSchools = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/schools");
      setSchools(res.data || []);
    } catch (error) {
      console.error("Fetch schools error:", error);
      setSchools([]);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/almanac/batches");
      setBatches(res.data || []);
      setBatchFetchError("");
    } catch (error) {
      console.error("Fetch batches error:", error);
      setBatches([]);
      setBatchFetchError("Unable to load batches. Restart backend server and try again.");
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (!headerRef.current) {
        return;
      }
      const { height } = headerRef.current.getBoundingClientRect();
      setHeaderOffset(Math.ceil(height));
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, []);

  useEffect(() => {
    if (activePanel !== "edit") {
      return;
    }

    const firstSchool = schools[0];

    if (!firstSchool) {
      setEditSchoolId("");
      setEditSchoolName("");
      setEditPrograms([]);
      return;
    }

    if (editSchoolId) {
      const updatedSchool = schools.find((school) => school._id === editSchoolId);
      if (updatedSchool) {
        setEditSchoolName(updatedSchool.name || "");
        setEditPrograms([...(updatedSchool.programs || [])]);
        return;
      }
    }

    setEditSchoolId(firstSchool._id);
    setEditSchoolName(firstSchool.name || "");
    setEditPrograms([...(firstSchool.programs || [])]);
  }, [activePanel, schools, editSchoolId]);

  const openPanel = async (panel) => {
    if (panel === "home") {
      setActivePanel("home");
      navigate("/");
      return;
    }

    if (panel === "view") {
      await fetchBatches();
    }
    setActivePanel(panel);
  };

  const programCountLabel = (count) => {
    if (count === 1) {
      return "1 Programme";
    }
    return `${count} Programmes`;
  };

  const groupBatchesByRange = (batchList) => {
    const grouped = {};

    (batchList || []).forEach((item) => {
      const key = `${item.batchStart}-${item.batchEnd}`;
      if (!grouped[key]) {
        grouped[key] = {
          batchStart: item.batchStart,
          batchEnd: item.batchEnd,
          programs: []
        };
      }
      grouped[key].programs.push({
        name: item.program,
        year: item.year,
        id: item._id
      });
    });

    return Object.values(grouped).sort((a, b) => b.batchStart - a.batchStart);
  };

  const handleAddProgram = () => {
    if (!addProgramInput.trim()) {
      return;
    }
    setAddPrograms((prev) => [...prev, addProgramInput.trim()]);
    setAddProgramInput("");
  };

  const handleSaveSchool = async () => {
    if (!addSchoolName.trim() || addPrograms.length === 0) {
      alert("Enter school name and add at least one programme");
      return;
    }

    await axios.post("http://localhost:5000/api/schools", {
      name: addSchoolName.trim(),
      programs: addPrograms
    });

    setAddSchoolName("");
    setAddProgramInput("");
    setAddPrograms([]);
    await fetchSchools();
    setActivePanel("home");
  };

  const handleEditSchoolSelect = (schoolId) => {
    const school = schools.find((item) => item._id === schoolId);
    if (!school) {
      return;
    }
    setEditSchoolId(school._id);
    setEditSchoolName(school.name || "");
    setEditPrograms([...(school.programs || [])]);
  };

  const handleEditProgramAdd = () => {
    if (!editProgramInput.trim()) {
      return;
    }
    setEditPrograms((prev) => [...prev, editProgramInput.trim()]);
    setEditProgramInput("");
  };

  const handleEditProgramChange = (index, value) => {
    setEditPrograms((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleEditProgramDelete = (index) => {
    setEditPrograms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSchool = async () => {
    if (!editSchoolId) {
      return;
    }

    if (!editSchoolName.trim() || editPrograms.length === 0) {
      alert("School name and programmes are required");
      return;
    }

    await axios.put(`http://localhost:5000/api/schools/${editSchoolId}`, {
      name: editSchoolName.trim(),
      programs: editPrograms
    });

    await fetchSchools();
  };

  const handleDeleteSchool = async () => {
    if (!editSchoolId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this school?");
    if (!shouldDelete) {
      return;
    }

    await axios.delete(`http://localhost:5000/api/schools/${editSchoolId}`);
    await fetchSchools();
  };

  return (
    <>
      <section className="landingShell" style={{ "--header-offset": `${headerOffset}px` }}>
        <div className="header" ref={headerRef}>
          <img src="/Aurora Logo.png" alt="Aurora Logo" className="headerLogo" />
          <div className="heroTitleWrap">
            <h1 className="headerTitle" onClick={() => setActivePanel("home")}>
              Aurora University Almanac
            </h1>
          </div>
          <p className="headerSubTitle">
            Build, manage, and review academic almanac plans with a cleaner workflow.
          </p>
        </div>

        <aside className="sideDrawer">
          <button className="drawerLink" onClick={() => openPanel("home")}>Home</button>
          <button className="drawerLink" onClick={() => openPanel("view")}>View</button>
          <button className="drawerLink" onClick={() => openPanel("add")}>Add</button>
          <button className="drawerLink" onClick={() => openPanel("edit")}>Edit</button>
        </aside>

        {activePanel === "home" && (
          <section className="plainPanel">
            <h2 className="panelTitle">Schools</h2>
            <div className="cardsGrid">
              {schools.map((school, index) => (
                <button
                  key={school._id}
                  className="schoolCard"
                  onClick={() => setSelectedSchool(school)}
                  style={{
                    animationDelay: `${index * 70}ms`,
                    background: schoolCardPalette[index % schoolCardPalette.length].bg,
                    borderColor: schoolCardPalette[index % schoolCardPalette.length].border
                  }}
                >
                  <h3>{school.name}</h3>
                  <p>{programCountLabel((school.programs || []).length)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {activePanel === "view" && (
          <section className="plainPanel">
            <h2 className="panelTitle">Saved Almanac Batches</h2>
            {batchFetchError && <p className="panelInfo">{batchFetchError}</p>}
            {!batchFetchError && batches.length === 0 && (
              <p className="panelInfo">No saved batches found.</p>
            )}
            <div className="cardsGrid">
              {groupBatchesByRange(batches).map((batchGroup, index) => (
                <button
                  key={`${batchGroup.batchStart}-${batchGroup.batchEnd}`}
                  className="batchCard"
                  onClick={() =>
                    navigate(
                      `/almanac/batch/${batchGroup.batchStart}/${batchGroup.batchEnd}`
                    )
                  }
                  style={{
                    animationDelay: `${index * 70}ms`,
                    background: schoolCardPalette[index % schoolCardPalette.length].bg,
                    borderColor: schoolCardPalette[index % schoolCardPalette.length].border
                  }}
                >
                  <h3>
                    {batchGroup.batchStart}-{batchGroup.batchEnd} Batch
                  </h3>
                  <p>{batchGroup.programs.length} Program{batchGroup.programs.length !== 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {activePanel === "add" && (
          <section className="plainPanel centerPanel">
            <div className="formPanel">
              <h2 className="panelTitle">Add School</h2>

              <label className="formLabel">School Name</label>
              <input
                className="formInput"
                placeholder="Enter school name"
                value={addSchoolName}
                onChange={(e) => setAddSchoolName(e.target.value)}
              />

              <label className="formLabel">Programmes</label>
              <div className="formRow">
                <input
                  className="formInput"
                  placeholder="Add one programme"
                  value={addProgramInput}
                  onChange={(e) => setAddProgramInput(e.target.value)}
                />
                <button className="formButton" onClick={handleAddProgram}>Add</button>
              </div>

              {addPrograms.length > 0 && (
                <div className="chipList">
                  {addPrograms.map((programme, index) => (
                    <span className="chip" key={`${programme}-${index}`}>{programme}</span>
                  ))}
                </div>
              )}

              <div className="formActions">
                <button className="formButton primary" onClick={handleSaveSchool}>Save</button>
                <button className="formButton" onClick={() => setActivePanel("home")}>Cancel</button>
              </div>
            </div>
          </section>
        )}

        {activePanel === "edit" && (
          <section className="plainPanel centerPanel">
            <div className="formPanel">
              <h2 className="panelTitle">Edit School</h2>

              {schools.length === 0 ? (
                <p className="panelInfo">No schools found to edit.</p>
              ) : (
                <>
                  <label className="formLabel">Choose School</label>
                  <select
                    className="formInput"
                    value={editSchoolId}
                    onChange={(e) => handleEditSchoolSelect(e.target.value)}
                  >
                    {schools.map((school) => (
                      <option key={school._id} value={school._id}>
                        {school.name}
                      </option>
                    ))}
                  </select>

                  <label className="formLabel">School Name</label>
                  <input
                    className="formInput"
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    placeholder="School name"
                  />

                  <label className="formLabel">Programmes</label>
                  {editPrograms.map((programme, index) => (
                    <div className="formRow" key={`edit-programme-${index}`}>
                      <input
                        className="formInput"
                        value={programme}
                        onChange={(e) => handleEditProgramChange(index, e.target.value)}
                      />
                      <button
                        className="formButton danger"
                        onClick={() => handleEditProgramDelete(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="formRow">
                    <input
                      className="formInput"
                      placeholder="New programme"
                      value={editProgramInput}
                      onChange={(e) => setEditProgramInput(e.target.value)}
                    />
                    <button className="formButton" onClick={handleEditProgramAdd}>Add</button>
                  </div>

                  <div className="formActions">
                    <button className="formButton primary" onClick={handleUpdateSchool}>
                      Save Changes
                    </button>
                    <button className="formButton danger" onClick={handleDeleteSchool}>
                      Delete School
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </section>

      {selectedSchool && (
        <ProgramModal school={selectedSchool} close={() => setSelectedSchool(null)} />
      )}
    </>
  );
}

export default Header;