import { useEffect, useMemo, useRef, useState } from "react";
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
  const [savedBatchFilters, setSavedBatchFilters] = useState({
    schoolName: "",
    programName: "",
    batchKey: ""
  });
  const [addSchoolName, setAddSchoolName] = useState("");
  const [addProgramInput, setAddProgramInput] = useState("");
  const [addPrograms, setAddPrograms] = useState([]);
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editPrograms, setEditPrograms] = useState([]);
  const [editProgramInput, setEditProgramInput] = useState("");

  const normalizeSchoolName = (value) =>
    (value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const getSchoolCardPalette = (schoolName) => {
    const normalized = normalizeSchoolName(schoolName);

    if (normalized.includes("informatics")) {
      return { bg: "#fff9dc", border: "#e6d88a" }; // light yellow
    }

    if (normalized.includes("engineering")) {
      return { bg: "#eaf4ff", border: "#9fc2e6" }; // light blue
    }

    if (normalized.includes("law")) {
      return { bg: "#f3f3f3", border: "#8a8a8a" }; // light black/charcoal theme
    }

    if (normalized.includes("health science") || normalized.includes("health sciences")) {
      return { bg: "#e8f8ec", border: "#9dc9a8" }; // light green
    }

    if (normalized.includes("architecture")) {
      return { bg: "#fff2e5", border: "#e5b17b" }; // light orange
    }

    if (normalized.includes("management")) {
      return { bg: "#ffecee", border: "#e2a1a8" }; // light red
    }

    if (normalized.includes("psychology")) {
      return { bg: "#f2f2f5", border: "#b9bac4" }; // light ash
    }

    if (
      normalized.includes("ancient hindu science")
      || normalized.includes("ancient hindu sciences")
      || normalized.includes("school of ahs")
      || normalized.includes(" ahs")
    ) {
      return { bg: "#f4efff", border: "#b9a8df" }; // light purple
    }

    return { bg: "#f5f8ff", border: "#c4d2ef" };
  };

  const drawerItems = [
    {
      key: "home",
      label: "Overview",
      title: "Home",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6.2H9.5V21H5a1 1 0 0 1-1-1z" />
        </svg>
      )
    },
    {
      key: "view",
      label: "Saved Almanac Batches",
      title: "View",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5c-5.5 0-9.9 3.3-11 7 1.1 3.7 5.5 7 11 7s9.9-3.3 11-7c-1.1-3.7-5.5-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
        </svg>
      )
    },
    {
      key: "add",
      label: "Add School",
      title: "Add",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.5 3.5 8v13.5h6.2v-5.8h4.6v5.8h6.2V8L12 2.5zm0 2.5 6 4v11h-2.2v-5.8H8.2V20H6V9z" />
        </svg>
      )
    },
    {
      key: "edit",
      label: "Edit School",
      title: "Edit",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h10a2 2 0 0 1 2 2v14l-4-2.5L11 21l-4-4.5L3 19V5a2 2 0 0 1 2-2zm0 2v10.2l1.8-1.2L11 18l3.2-3.3 2.8 1.8V5H7z" />
        </svg>
      )
    }
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

  const getSchoolForProgram = (programName) => {
    const matchedSchool = schools.find((school) =>
      (school.programs || []).some(
        (program) => (program || "").toLowerCase().replace(/\s+/g, " ").trim()
          === (programName || "").toLowerCase().replace(/\s+/g, " ").trim()
      )
    );

    return matchedSchool?.name || "School";
  };

  const clearSavedBatchFilters = () => {
    setSavedBatchFilters({
      schoolName: "",
      programName: "",
      batchKey: ""
    });
  };

  const savedBatchOptions = useMemo(() => {
    const schoolNames = (schools || []).map((item) => item.name).sort((a, b) => a.localeCompare(b));

    const selectedSchool = (schools || []).find((item) => item.name === savedBatchFilters.schoolName);
    const selectedPrograms = Array.isArray(selectedSchool?.programs) ? selectedSchool.programs : [];

    const programNames = selectedPrograms.sort((a, b) => a.localeCompare(b));

    const selectedProgramBatches = savedBatchFilters.programName
      ? batches.filter((item) => item.program === savedBatchFilters.programName)
      : [];

    const batchKeys = Array.from(
      new Set(selectedProgramBatches.map((item) => `${item.batchStart}-${item.batchEnd}`))
    ).sort((a, b) => {
      const [aStart] = a.split("-").map(Number);
      const [bStart] = b.split("-").map(Number);
      return bStart - aStart;
    });

    return {
      schools: schoolNames,
      programs: programNames,
      batches: batchKeys
    };
  }, [schools, batches, savedBatchFilters.schoolName, savedBatchFilters.programName]);

  const filteredSavedBatches = useMemo(() => {
    return batches.filter((item) => {
      const schoolName = getSchoolForProgram(item.program);
      const batchKey = `${item.batchStart}-${item.batchEnd}`;

      if (savedBatchFilters.schoolName && schoolName !== savedBatchFilters.schoolName) {
        return false;
      }

      if (savedBatchFilters.programName && item.program !== savedBatchFilters.programName) {
        return false;
      }

      if (savedBatchFilters.batchKey && batchKey !== savedBatchFilters.batchKey) {
        return false;
      }

      return true;
    });
  }, [batches, savedBatchFilters]);

  const handleDeleteSavedAlmanac = async (batchItem) => {
    const shouldDelete = window.confirm(
      `Delete saved almanac for ${batchItem.batchStart}-${batchItem.batchEnd} / ${batchItem.program}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/almanac/${batchItem._id}`);

      setBatches((current) =>
        current.filter((item) => item._id !== batchItem._id)
      );
    } catch (error) {
      console.error("Delete saved almanac error:", error);
      setBatchFetchError(error?.response?.data?.message || "Unable to delete saved almanac.");
    }
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
          {drawerItems.map((item) => (
            <button
              key={item.key}
              className={`drawerLink ${activePanel === item.key ? "active" : ""}`}
              onClick={() => openPanel(item.key)}
              title={item.title}
              aria-label={item.title}
            >
              <span className="drawerIcon" aria-hidden="true">{item.icon}</span>
              <span className="drawerText">{item.label}</span>
              <span className="drawerChevron" aria-hidden="true">›</span>
            </button>
          ))}
        </aside>

        {activePanel === "home" && (
          <section className="plainPanel">
            <div className="panelTitleRow">
              <h2 className="panelTitle">Schools</h2>
              <button
                className="academicCalendarLaunch"
                onClick={() => navigate("/academic-calendar")}
              >
                Academic Calendar
              </button>
            </div>
            <div className="cardsGrid">
              {schools.map((school, index) => {
                const palette = getSchoolCardPalette(school.name || "");

                return (
                  <button
                    key={school._id}
                    className="schoolCard"
                    onClick={() => setSelectedSchool(school)}
                    style={{
                      animationDelay: `${index * 70}ms`,
                      background: palette.bg,
                      borderColor: palette.border
                    }}
                  >
                    <h3>{school.name}</h3>
                    <p>{programCountLabel((school.programs || []).length)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {activePanel === "view" && (
          <section className="plainPanel">
            <h2 className="panelTitle">Saved Almanac Batches</h2>
            {batchFetchError && <p className="panelInfo">{batchFetchError}</p>}
            {!batchFetchError && batches.length === 0 && (
              <p className="panelInfo">No saved almanacs.</p>
            )}

            {batches.length > 0 && (
              <div className="savedBatchFilterBar">
                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-school">School</label>
                  <select
                    id="saved-batch-school"
                    value={savedBatchFilters.schoolName}
                    onChange={(event) =>
                      setSavedBatchFilters({
                        schoolName: event.target.value,
                        programName: "",
                        batchKey: ""
                      })
                    }
                  >
                    <option value="">Select School</option>
                    {savedBatchOptions.schools.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-program">Programme</label>
                  <select
                    id="saved-batch-program"
                    value={savedBatchFilters.programName}
                    disabled={!savedBatchFilters.schoolName}
                    onChange={(event) =>
                      setSavedBatchFilters((current) => ({
                        ...current,
                        programName: event.target.value,
                        batchKey: ""
                      }))
                    }
                  >
                    <option value="">Select Programme</option>
                    {savedBatchOptions.programs.map((programName) => (
                      <option key={programName} value={programName}>
                        {programName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="savedBatchFilterItem">
                  <label htmlFor="saved-batch-range">Batch</label>
                  <select
                    id="saved-batch-range"
                    value={savedBatchFilters.batchKey}
                    disabled={!savedBatchFilters.programName}
                    onChange={(event) =>
                      setSavedBatchFilters((current) => ({
                        ...current,
                        batchKey: event.target.value
                      }))
                    }
                  >
                    <option value="">Select Batch</option>
                    {savedBatchOptions.batches.map((batchKey) => (
                      <option key={batchKey} value={batchKey}>
                        {batchKey}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="formButton" onClick={clearSavedBatchFilters}>Clear Filters</button>
              </div>
            )}

            <div className="cardsGrid">
              {filteredSavedBatches.map((batchItem, index) => {
                const schoolName = getSchoolForProgram(batchItem.program);
                const palette = getSchoolCardPalette(schoolName);

                return (
                  <div
                    key={batchItem._id}
                    className="batchCard"
                    style={{
                      animationDelay: `${index * 70}ms`,
                      background: palette.bg,
                      borderColor: palette.border
                    }}
                  >
                    <button
                      type="button"
                      className="batchCardDeleteBtn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteSavedAlmanac(batchItem);
                      }}
                      aria-label="Delete saved almanac"
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="batchCardBody"
                      onClick={() => {
                        if (!batchItem._id) {
                          setBatchFetchError("Invalid almanac id for selected card.");
                          return;
                        }

                        navigate(`/almanac/view/${batchItem._id}`);
                      }}
                    >
                      <h3>{schoolName}</h3>
                      <p>{batchItem.program}</p>
                      <p>
                        Batch: {batchItem.batchStart}-{batchItem.batchEnd}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>

            {!batchFetchError && batches.length > 0 && filteredSavedBatches.length === 0 && (
              <p className="panelInfo">No saved almanacs.</p>
            )}
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