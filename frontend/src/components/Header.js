import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ProgramModal from "./ProgramModal";
import AddSchoolModal from "./AddSchoolModal";
import EditSchoolModal from "./EditSchoolModal";
import "./Header.css";

function Header() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchFetchError, setBatchFetchError] = useState("");

  const fetchSchools = async () => {
    const res = await axios.get("http://localhost:5000/api/schools");
    setSchools(res.data);
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

  const handleOpenView = async () => {
    await fetchBatches();
    setShowDropdown(false);
    setShowViewDropdown((prev) => !prev);
  };

  return (
    <>
      <div className="header">
        <button className="addBtn" onClick={() => setShowAdd(true)}>
          + Add
        </button>

        <button className="editBtn" onClick={() => setShowEdit(true)}>
          ✏️ Edit
        </button>

        <div className="dropdown viewDropdown">
          <button className="viewBtn" onClick={handleOpenView}>
            View ▼
          </button>

          {showViewDropdown && (
            <div className="dropdownContent">
              {batchFetchError && (
                <div className="dropdownEmpty">{batchFetchError}</div>
              )}

              {!batchFetchError && batches.length === 0 && (
                <div className="dropdownEmpty">No saved batches found</div>
              )}

              {batches.map((item) => (
                <div
                  key={item._id}
                  className="dropdownItem"
                  onClick={() => {
                    navigate(`/almanac/view/${item._id}`);
                    setShowViewDropdown(false);
                  }}
                >
                  {item.batchStart}-{item.batchEnd} | {item.program} | Year {item.year}
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="headerTitle">Academic Almanac</h2>

        <div className="dropdown schoolDropdown">
          <button className="dropdownToggle" onClick={() => setShowDropdown(!showDropdown)}>
            Schools ▼
          </button>

          {showDropdown && (
            <div className="dropdownContent">
              {schools.map((s) => (
                <div
                  key={s._id}
                  className="dropdownItem"
                  onClick={() => {
                    setSelectedSchool(s);
                    setShowDropdown(false);
                  }}
                >
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedSchool && (
        <ProgramModal school={selectedSchool} close={() => setSelectedSchool(null)} />
      )}

      {showAdd && (
        <AddSchoolModal close={() => setShowAdd(false)} refresh={fetchSchools} />
      )}

      {showEdit && (
        <EditSchoolModal
          schools={schools}
          close={() => setShowEdit(false)}
          refresh={fetchSchools}
        />
      )}
    </>
  );
}

export default Header;