import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import html2pdf from "html2pdf.js/dist/html2pdf.min.js";
import ExcelJS from "exceljs";
import { getYearLabels } from "../utils/yearLabels";
import { getYearBandColor } from "../utils/yearBandColors";
import "./Almanac.css";

function AlmanacBatchView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [almanac, setAlmanac] = useState(null);
  const [schools, setSchools] = useState([]);
  const [downloading, setDownloading] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const paperRef = useRef(null);
  const downloadMenuRef = useRef(null);

  const yearNames = getYearLabels(almanac?.yearsData?.length).map((item) => item.toUpperCase());
  const romanTerms = ["I", "II", "III", "IV"];

  const isPostgraduateProgram = (programName) => {
    const normalized = (programName || "").toLowerCase().replace(/\s+/g, " ").trim();

    const postgraduatePrograms = [
      "m.tech",
      "mca",
      "mba",
      "m.sc (clinical psychology)",
      "m.arch",
      "llm",
      "llb",
      "m.sc yoga"
    ];

    return postgraduatePrograms.includes(normalized);
  };

  const normalize = (value) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const schoolBrandPalette = [
    { matches: ["engineering"], color: "rgb(192, 34, 34)" },
    { matches: ["informatics"], color: "rgb(229, 9, 127)" },
    { matches: ["management studies", "management"], color: "rgb(12, 84, 160)" },
    { matches: ["law"], color: "rgb(43, 42, 41)" },
    { matches: ["architecture"], color: "rgb(247, 167, 7)" },
    { matches: ["psychology"], color: "rgb(123, 62, 83)" },
    { matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"], color: "rgb(236, 105, 31)" },
    { matches: ["liberal arts"], color: "rgb(137, 137, 137)" },
    { matches: ["health sciences"], color: "rgb(0, 110, 54)" },
    { matches: ["pharmacy"], color: "rgb(120, 184, 51)" },
    { matches: ["school of sciences", "school of science", "sciences"], color: "rgb(243, 156, 163)" },
    { matches: ["ph.d", "phd"], color: "rgb(50, 43, 106)" }
  ];

  const getSchoolBrandColor = (name) => {
    const normalized = normalize(name);
    const matched = schoolBrandPalette.find((entry) =>
      entry.matches.some((keyword) => normalized.includes(keyword))
    );

    return matched?.color || "#4d5660";
  };

  const getContrastTextColor = (rgbColor) => {
    const values = String(rgbColor || "")
      .replace(/[^0-9,]/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));

    if (values.length < 3) {
      return "#ffffff";
    }

    const [r, g, b] = values;
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance > 170 ? "#1b1b1b" : "#ffffff";
  };

  const getSchoolForProgram = (programName) => {
    const school = schools.find((item) =>
      (item.programs || []).some((program) => normalize(program) === normalize(programName))
    );

    return school?.name || "";
  };

  const getProgramDisplayName = (programName) => {
    const normalizedProgram = normalize(programName);

    if (normalizedProgram === "b.tech" || normalizedProgram === "btech") {
      return "B.Tech CSE & Allied";
    }

    return programName || "";
  };

  useEffect(() => {
    const fetchAlmanac = async () => {
      try {
        const [almanacRes, schoolsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/almanac/${id}`),
          axios.get("http://localhost:5000/api/schools")
        ]);

        setAlmanac(almanacRes.data);
        setSchools(schoolsRes.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load the almanac. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlmanac();
  }, [id]);

  useEffect(() => {
    if (!showDownloadMenu) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showDownloadMenu]);

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

  const getDurationWeeks = (start, end) => {
    if (!start || !end) return "-";
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return "-";
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
    const weeks = Math.ceil(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  };

  const getHolidayRange = (holidays) => {
    const ranges = (holidays || [])
      .filter((item) => item.start && item.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  const getActivityRange = (term) => {
    const activities = (term?.activities && term.activities.length > 0)
      ? term.activities
      : [{ start: term?.activityStart, end: term?.activityEnd }];

    const ranges = activities
      .filter((item) => item?.start && item?.end)
      .map((item) => toRange(item.start, item.end));

    return ranges.length ? ranges.join(", ") : "-";
  };

  const getAssessmentRange = (term, termIndex) => {
    if (termIndex === 3) {
      return "-";
    }

    return toRange(term.assessmentStart, term.assessmentEnd);
  };

  const toArgb = (color) => {
    const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || "");
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
      }
      return `FF${hex.toUpperCase()}`;
    }

    const rgbMatch = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.exec(color || "");
    if (rgbMatch) {
      const toHex = (value) => Number(value).toString(16).padStart(2, "0").toUpperCase();
      return `FF${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
    }

    return "FFFFFFFF";
  };

  const handleEdit = () => {
    if (!almanac) return;

    navigate("/almanac", {
      state: {
        program: almanac.program,
        year: almanac.year,
        batchStart: almanac.batchStart,
        batchEnd: almanac.batchEnd
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!almanac || !paperRef.current) return;

    setShowDownloadMenu(false);
    setDownloadError("");
    setDownloading("pdf");

    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `almanac-${almanac.batchStart}-${almanac.batchEnd}-${almanac.program}.pdf`,
        image: { type: "png", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true
        },
        jsPDF: { orientation: "landscape", unit: "mm", format: "a4" }
      };

      await html2pdf().set(opt).from(paperRef.current).save();
    } catch (downloadPdfError) {
      console.error("Download almanac PDF error:", downloadPdfError);
      setDownloadError("Failed to download the almanac PDF. Please try again.");
    } finally {
      setDownloading("");
    }
  };

  const handleDownloadExcel = async () => {
    if (!almanac) return;

    setShowDownloadMenu(false);
    setDownloadError("");
    setDownloading("excel");

    try {
      const yearsData = almanac.yearsData || [];
      const schoolNameForExcel = getSchoolForProgram(almanac.program);
      const brandColorValue = getSchoolBrandColor(schoolNameForExcel);
      const brandTextColorValue = getContrastTextColor(brandColorValue);
      const batchLabel = `${almanac.batchStart}-${almanac.batchEnd}`;
      const programDisplayName = getProgramDisplayName(almanac.program);
      const bannerTitleForExcel = `${batchLabel} Batch ${isPostgraduateProgram(almanac.program) ? "Postgraduate" : "Undergraduate"} ${programDisplayName} Programme Almanac`;
      const yearLabelsForExcel = getYearLabels(yearsData.length).map((item) => item.toUpperCase());

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Almanac", {
        pageSetup: { orientation: "landscape", fitToPage: true }
      });

      const columnCount = 11;
      sheet.columns = [
        { width: 12 }, { width: 8 }, { width: 13 }, { width: 13 },
        { width: 15 }, { width: 15 }, { width: 11 }, { width: 22 },
        { width: 22 }, { width: 24 }, { width: 20 }
      ];

      const centerAlign = { vertical: "middle", horizontal: "center", wrapText: true };
      const thinBorder = { style: "thin", color: { argb: "FFD6E4F0" } };
      const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
      const brandFill = { type: "pattern", pattern: "solid", fgColor: { argb: toArgb(brandColorValue) } };
      const brandFont = { bold: true, size: 12, color: { argb: toArgb(brandTextColorValue) } };
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EBF3" } };
      const headerFont = { bold: true, color: { argb: "FF123A63" } };

      sheet.mergeCells(1, 1, 1, columnCount);
      const schoolCell = sheet.getCell(1, 1);
      schoolCell.value = (schoolNameForExcel || "School").toUpperCase();
      schoolCell.alignment = centerAlign;
      schoolCell.font = { bold: true, size: 13, color: { argb: toArgb(brandColorValue) } };
      sheet.getRow(1).height = 22;

      sheet.mergeCells(2, 1, 2, columnCount);
      const bannerCell = sheet.getCell(2, 1);
      bannerCell.value = bannerTitleForExcel;
      bannerCell.alignment = centerAlign;
      bannerCell.font = brandFont;
      bannerCell.fill = brandFill;
      sheet.getRow(2).height = 20;

      const headerRow1 = 3;
      const headerRow2 = 4;

      const setHeaderCell = (row, col, text) => {
        const cell = sheet.getCell(row, col);
        cell.value = text;
        cell.alignment = centerAlign;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = cellBorder;
        return cell;
      };

      sheet.mergeCells(headerRow1, 1, headerRow2, 1);
      setHeaderCell(headerRow1, 1, "Year");
      sheet.mergeCells(headerRow1, 2, headerRow2, 2);
      setHeaderCell(headerRow1, 2, "Term");
      sheet.mergeCells(headerRow1, 3, headerRow1, 4);
      setHeaderCell(headerRow1, 3, "Self Registration");
      setHeaderCell(headerRow2, 3, "Start");
      setHeaderCell(headerRow2, 4, "End");
      sheet.mergeCells(headerRow1, 5, headerRow1, 7);
      setHeaderCell(headerRow1, 5, "Term Duration");
      setHeaderCell(headerRow2, 5, "Commencement");
      setHeaderCell(headerRow2, 6, "Completion");
      setHeaderCell(headerRow2, 7, "Duration");
      sheet.mergeCells(headerRow1, 8, headerRow2, 8);
      setHeaderCell(headerRow1, 8, "Student Led Activities");
      sheet.mergeCells(headerRow1, 9, headerRow2, 9);
      setHeaderCell(headerRow1, 9, "Festival Holidays");
      sheet.mergeCells(headerRow1, 10, headerRow2, 10);
      setHeaderCell(headerRow1, 10, "Comprehensive Assessment");
      sheet.mergeCells(headerRow1, 11, headerRow2, 11);
      setHeaderCell(headerRow1, 11, "Break");

      let currentRow = headerRow2 + 1;

      yearsData.forEach((yearItem, yIndex) => {
        const terms = yearItem.terms || [];
        const yearStartRow = currentRow;
        const yearFill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: toArgb(getYearBandColor(yearsData.length, yIndex)) }
        };

        terms.forEach((term, tIndex) => {
          const row = sheet.getRow(currentRow);
          const rowValues = [
            tIndex === 0 ? (yearLabelsForExcel[yIndex] || `YEAR ${yIndex + 1}`) : "",
            romanTerms[tIndex] || term.termNumber,
            toDisplayDate(term.selfStart),
            toDisplayDate(term.selfEnd),
            toDisplayDate(term.termStart),
            toDisplayDate(term.termEnd),
            getDurationWeeks(term.termStart, term.termEnd),
            getActivityRange(term),
            getHolidayRange(term.holidays),
            getAssessmentRange(term, tIndex),
            toRange(term.breakStart, term.breakEnd)
          ];

          rowValues.forEach((value, colIndex) => {
            const cell = row.getCell(colIndex + 1);
            cell.value = value;
            cell.alignment = centerAlign;
            cell.fill = yearFill;
            cell.border = cellBorder;
            if (colIndex === 0) {
              cell.font = { bold: true, color: { argb: "FF0F3D70" } };
            }
          });

          currentRow += 1;
        });

        if (terms.length > 1) {
          sheet.mergeCells(yearStartRow, 1, currentRow - 1, 1);
        }
      });

      const signoffRow = currentRow;
      const midColumn = Math.ceil(columnCount / 2);
      sheet.mergeCells(signoffRow, 1, signoffRow, midColumn);
      sheet.mergeCells(signoffRow, midColumn + 1, signoffRow, columnCount);

      const deanCell = sheet.getCell(signoffRow, 1);
      deanCell.value = "Dean";
      deanCell.font = { bold: true, color: { argb: "FF1E2E3F" } };
      deanCell.alignment = { vertical: "middle", horizontal: "left" };

      const directorCell = sheet.getCell(signoffRow, midColumn + 1);
      directorCell.value = "Director Academics and Planning";
      directorCell.font = { bold: true, color: { argb: "FF1E2E3F" } };
      directorCell.alignment = { vertical: "middle", horizontal: "right" };
      sheet.getRow(signoffRow).height = 20;

      const footerRow = signoffRow + 1;
      sheet.mergeCells(footerRow, 1, footerRow, columnCount);
      const footerCell = sheet.getCell(footerRow, 1);
      footerCell.value = "Uppal, Hyderabad - 500098. Telangana, aurora.edu.in";
      footerCell.alignment = centerAlign;
      footerCell.font = { bold: true, size: 10, color: { argb: toArgb(brandTextColorValue) } };
      footerCell.fill = brandFill;
      sheet.getRow(footerRow).height = 18;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `almanac-${almanac.batchStart}-${almanac.batchEnd}-${almanac.program}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadExcelError) {
      console.error("Download almanac Excel error:", downloadExcelError);
      setDownloadError("Failed to download the almanac Excel file. Please try again.");
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return <h3 className="previewStatus">Loading almanac...</h3>;
  }

  if (error || !almanac) {
    return (
      <div className="viewPageShell">
        <h3 className="previewStatus">{error || "Almanac not found."}</h3>
        <button className="previewBtn" onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const schoolName = getSchoolForProgram(almanac.program);
  const brandColor = getSchoolBrandColor(schoolName);
  const brandTextColor = getContrastTextColor(brandColor);
  const batchLabel = `${almanac.batchStart}-${almanac.batchEnd}`;
  const programDisplayName = getProgramDisplayName(almanac.program);
  const bannerTitle = `${batchLabel} Batch ${isPostgraduateProgram(almanac.program) ? "Postgraduate" : "Undergraduate"} ${programDisplayName} Programme Almanac`;

  return (
    <div className="viewPageShell">
      <div className="viewActions">
        <button className="previewBtn" onClick={() => navigate("/")}>Back</button>
        <button className="saveBtn" onClick={handleEdit}>Edit</button>

        <div className="downloadMenuWrap" ref={downloadMenuRef}>
          <button
            type="button"
            className="saveBtn"
            onClick={() => setShowDownloadMenu((current) => !current)}
            disabled={Boolean(downloading)}
          >
            {downloading ? "Downloading..." : "Download"}
          </button>

          {showDownloadMenu && (
            <div className="downloadMenu">
              <button type="button" onClick={handleDownloadPdf} disabled={Boolean(downloading)}>
                Download as PDF
              </button>
              <button type="button" onClick={handleDownloadExcel} disabled={Boolean(downloading)}>
                Download as Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {downloadError && <p className="downloadErrorText">{downloadError}</p>}

      <div
        className="previewPaper batchViewPaper"
        ref={paperRef}
        style={{
          "--preview-brand-color": brandColor,
          "--preview-brand-text": brandTextColor
        }}
      >
        <div className="previewHeaderBar">
          <div className="previewHeaderLeft">
            <img src="/text.jpeg" alt="Aurora University text" className="previewTextLogo" />
          </div>

          <img src="/Aurora Logo.png" alt="Aurora emblem" className="previewTopLogo previewTopLogoRight" />
        </div>

        <div className="previewSchoolTitle">{(schoolName || "School").toUpperCase()}</div>

        <div className="previewBanner">
          {bannerTitle}
        </div>

        <div className="previewTableWrap previewTableWrapWithGap">
          <table className="previewTable">
            <thead>
              <tr>
                <th rowSpan="2">Year</th>
                <th rowSpan="2">Term</th>
                <th colSpan="2">Self Registration</th>
                <th colSpan="3">Term Duration</th>
                <th rowSpan="2">Student Led Activities</th>
                <th rowSpan="2">Festival Holidays</th>
                <th rowSpan="2">Comprehensive Assessment</th>
                <th rowSpan="2">Break</th>
              </tr>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Commencement</th>
                <th>Completion</th>
                <th>Duration</th>
              </tr>
            </thead>

            <tbody>
              {(almanac.yearsData || []).map((yearItem, yIndex) => (
                (yearItem.terms || []).map((term, tIndex) => (
                  <tr
                    className="yearBand"
                    key={`${yIndex}-${tIndex}`}
                    style={{ "--year-band-bg": getYearBandColor((almanac.yearsData || []).length, yIndex) }}
                  >
                    {tIndex === 0 && (
                      <td className="previewYearCell" rowSpan={(yearItem.terms || []).length}>
                        {yearNames[yIndex] || `YEAR ${yIndex + 1}`}
                      </td>
                    )}

                    <td>{romanTerms[tIndex] || term.termNumber}</td>
                    <td>{toDisplayDate(term.selfStart)}</td>
                    <td>{toDisplayDate(term.selfEnd)}</td>
                    <td>{toDisplayDate(term.termStart)}</td>
                    <td>{toDisplayDate(term.termEnd)}</td>
                    <td>{getDurationWeeks(term.termStart, term.termEnd)}</td>
                    <td>{getActivityRange(term)}</td>
                    <td>{getHolidayRange(term.holidays)}</td>
                    <td>{getAssessmentRange(term, tIndex)}</td>
                    <td>{toRange(term.breakStart, term.breakEnd)}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>

        <div className="previewSignoffRow">
          <div className="previewSignoffLabel">Dean</div>
          <div className="previewSignoffLabel">Director Academics and Planning</div>
        </div>

        <div className="previewFooterBar">
          Uppal, Hyderabad - 500098. Telangana, aurora.edu.in
        </div>
      </div>
    </div>
  );
}

export default AlmanacBatchView;