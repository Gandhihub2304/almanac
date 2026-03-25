import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./Almanac.css";

function AlmanacBatchView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [almanac, setAlmanac] = useState(null);

  const yearNames = ["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR"];
  const romanTerms = ["I", "II", "III", "IV"];

  useEffect(() => {
    const fetchAlmanac = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/almanac/${id}`);
        setAlmanac(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load almanac");
      } finally {
        setLoading(false);
      }
    };

    fetchAlmanac();
  }, [id]);

  const toDisplayDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const yearValue = date.getFullYear();
    return `${day}.${month}.${yearValue}`;
  };

  const toRange = (start, end) => {
    if (!start || !end) return "-";
    return `${toDisplayDate(start)} to ${toDisplayDate(end)}`;
  };

  const getHolidayRange = (holidays) => {
    const ranges = (holidays || [])
      .filter((item) => item.start && item.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  if (loading) {
    return <h3 className="previewStatus">Loading almanac...</h3>;
  }

  if (error || !almanac) {
    return (
      <div className="viewPageShell">
        <h3 className="previewStatus">{error || "Almanac not found"}</h3>
        <button className="previewBtn" onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="viewPageShell">
      <div className="viewActions">
        <button className="previewBtn" onClick={() => navigate("/")}>Back</button>
        <button className="saveBtn" onClick={() => window.print()}>Print</button>
      </div>

      <div className="previewPaper batchViewPaper">
        <div className="previewBanner">
          {almanac.batchStart}-{almanac.batchEnd} Batch Undergraduate {almanac.program} Programme Almanac
        </div>

        <div className="previewTableWrap">
          <table className="previewTable">
            <thead>
              <tr>
                <th>Year</th>
                <th>Term</th>
                <th>Self Registration</th>
                <th>Term Duration</th>
                <th>Student Led Activities</th>
                <th>Festival Holidays</th>
                <th>Comprehensive Assessment</th>
                <th>Break</th>
              </tr>
            </thead>

            <tbody>
              {(almanac.yearsData || []).map((yearItem, yIndex) => (
                (yearItem.terms || []).map((term, tIndex) => (
                  <tr className={`yearBand yearBand${yIndex}`} key={`${yIndex}-${tIndex}`}>
                    {tIndex === 0 && (
                      <td className="previewYearCell" rowSpan={(yearItem.terms || []).length}>
                        {yearNames[yIndex] || `YEAR ${yIndex + 1}`}
                      </td>
                    )}

                    <td>{romanTerms[tIndex] || term.termNumber}</td>
                    <td>{toRange(term.selfStart, term.selfEnd)}</td>
                    <td>{toRange(term.termStart, term.termEnd)}</td>
                    <td>{toRange(term.activityStart, term.activityEnd)}</td>
                    <td>{getHolidayRange(term.holidays)}</td>
                    <td>{toRange(term.assessmentStart, term.assessmentEnd)}</td>
                    <td>{toRange(term.breakStart, term.breakEnd)}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AlmanacBatchView;