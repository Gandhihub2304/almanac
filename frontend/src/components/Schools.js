import { useState } from "react";
import ProgramModal from "./ProgramModal";
import "./Schools.css";

function Schools() {
  const [selectedSchool, setSelectedSchool] = useState(null);

  const schools = [
    "School of Engineering",
    "School of Informatics",
    "School of Management",
    "School of Psychology",
    "School of Health Sciences",
    "School of Arts",
    "School of AHS",
    "School of Law"
  ];

  return (
    <>
      <div className="schoolContainer">
        {schools.map((school, index) => (
          <button
            key={index}
            className="schoolBtn"
            onClick={() => setSelectedSchool(school)}
          >
            {school}
          </button>
        ))}
      </div>

      {selectedSchool && (
        <ProgramModal
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </>
  );
}

export default Schools;