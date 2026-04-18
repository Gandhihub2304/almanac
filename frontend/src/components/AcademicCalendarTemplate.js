import "./AcademicCalendarTemplate.css";

const normalizeSchoolName = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

const schoolBrandPalette = [
  { matches: ["engineering"], color: "#0f5fa8" },
  { matches: ["informatics"], color: "#1d75c1" },
  { matches: ["management studies", "management"], color: "#1669b3" },
  { matches: ["law"], color: "#245f9d" },
  { matches: ["architecture"], color: "#3a7abd" },
  { matches: ["psychology"], color: "#4d6fb0" },
  { matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"], color: "#3f86c6" },
  { matches: ["liberal arts"], color: "#5d7f9f" },
  { matches: ["health sciences", "health science"], color: "#1580b8" },
  { matches: ["pharmacy"], color: "#2a8ac7" },
  { matches: ["school of sciences", "school of science", "sciences"], color: "#5b8fc7" },
  { matches: ["ph.d", "phd"], color: "#3463af" }
];

const getSchoolBrandColor = (schoolName) => {
  const normalized = normalizeSchoolName(schoolName);
  const matched = schoolBrandPalette.find((entry) =>
    entry.matches.some((keyword) => normalized.includes(keyword))
  );

  return matched?.color || "#0f5fa8";
};

const STATUS_COLORS = {
  "student-led": "#d4e8fb",
  event: "#dfeefb",
  weekend: "#eef2f7",
  compensatory: "#b9d5f2",
  "self-registration": "#eef5fb",
  "term-begin": "#9fc4e4",
  "term-end": "#7aa4d1",
  assessment: "#d7e6ff",
  break: "#cfe0f5",
  holiday: "#bfd3ea",
  "results-day": "#0f5fa8",
  "term-work": "#ffffff"
};

const getDayCellStyle = (dayCell) => {
  const statuses = Array.isArray(dayCell?.statuses) ? dayCell.statuses.filter(Boolean) : [];

  if (statuses.length >= 2) {
    const firstColor = STATUS_COLORS[statuses[0]] || STATUS_COLORS[dayCell.status] || "#ffffff";
    const secondColor = STATUS_COLORS[statuses[1]] || STATUS_COLORS[dayCell.status] || firstColor;
    return {
      background: `linear-gradient(135deg, ${firstColor} 0 50%, ${secondColor} 50% 100%)`
    };
  }

  if (statuses.length === 1) {
    return { background: STATUS_COLORS[statuses[0]] || STATUS_COLORS[dayCell.status] || "#ffffff" };
  }

  return {};
};

function AcademicCalendarTemplate({ headingLines = [], model, compact = false, schoolName = "" }) {
  const safeModel = model || { months: [], weekdayLabels: [], legend: [] };
  const brandColor = getSchoolBrandColor(schoolName);

  return (
    <section
      className={`calendarTemplateSheet ${compact ? "compact" : ""}`}
      style={{ "--template-brand-color": brandColor }}
    >
      <header className="calendarTemplateHead">
        <div className="calendarTemplateLogoBlock left">
          <img src="/text.jpeg" alt="Aurora University" className="calendarTemplateTextLogo" />
        </div>

        <div className="calendarTemplateTitleBlock">
          {headingLines.map((line, index) => (
            <p key={`template-heading-${index}`} className={`line-${index + 1}`}>
              {line}
            </p>
          ))}
        </div>

        <div className="calendarTemplateLogoBlock right">
          <img src="/Aurora Logo.png" alt="Aurora" className="calendarTemplateLogo" />
        </div>
      </header>

      <div className="calendarTemplateBody">
        {safeModel.months.map((month) => (
          <article key={month.key} className="templateMonthCard">
            <div className="templateMonthHeading">
              <h3>{month.title}</h3>
            </div>

            <div className="templateMonthLayout">
              <div className="templateMonthEventsPane">
                <ul className="templateMonthEvents">
                  {month.events.length ? (
                    month.events.map((eventLine, eventIndex) => (
                      <li key={`${month.key}-event-${eventIndex}`}>
                        <span className="eventRange">{eventLine.rangeLabel}</span>
                      </li>
                    ))
                  ) : (
                    <li className="empty">No listed events</li>
                  )}
                </ul>
              </div>

              <div className="templateMonthCalendarPane">
                <table className="templateMiniCalendar" aria-label={month.title}>
                  <thead>
                    <tr>
                      {safeModel.weekdayLabels.map((label, index) => (
                        <th key={`${month.key}-weekday-${index}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {month.weeks.map((week, weekIndex) => (
                      <tr key={`${month.key}-week-${weekIndex}`}>
                        {week.map((dayCell, dayIndex) => (
                          <td
                            key={`${month.key}-${weekIndex}-${dayIndex}`}
                            className={dayCell ? `status-${dayCell.status}` : "status-empty"}
                            style={dayCell ? getDayCellStyle(dayCell) : undefined}
                          >
                            {dayCell ? dayCell.day : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="calendarTemplateLegend">
        {safeModel.legend.map((item) => (
          <span key={item.key} className="legendItem">
            <i className={`legendSwatch status-${item.key}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </footer>

      <div className="calendarTemplateFooterBar">
        Uppal, Hyderabad - 500098. Telangana, aurora.edu.in
      </div>
    </section>
  );
}

export default AcademicCalendarTemplate;