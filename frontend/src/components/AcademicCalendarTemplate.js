import "./AcademicCalendarTemplate.css";

const normalizeSchoolName = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

const schoolBrandPalette = [
  { matches: ["engineering"], color: "rgb(192, 34, 34)" },
  { matches: ["informatics"], color: "rgb(229, 9, 127)" },
  { matches: ["management studies", "management"], color: "rgb(12, 84, 160)" },
  { matches: ["law"], color: "rgb(43, 42, 41)" },
  { matches: ["architecture"], color: "rgb(247, 167, 7)" },
  { matches: ["psychology"], color: "rgb(123, 62, 83)" },
  { matches: ["ancient hindu sciences", "ancient hindu science", "school of ahs", " ahs"], color: "rgb(236, 105, 31)" },
  { matches: ["liberal arts"], color: "rgb(137, 137, 137)" },
  { matches: ["health sciences", "health science"], color: "rgb(0, 110, 54)" },
  { matches: ["pharmacy"], color: "rgb(120, 184, 51)" },
  { matches: ["school of sciences", "school of science", "sciences"], color: "rgb(243, 156, 163)" },
  { matches: ["ph.d", "phd"], color: "rgb(50, 43, 106)" }
];

const getSchoolBrandColor = (schoolName) => {
  const normalized = normalizeSchoolName(schoolName);
  const matched = schoolBrandPalette.find((entry) =>
    entry.matches.some((keyword) => normalized.includes(keyword))
  );

  return matched?.color || "#0f69aa";
};

const STATUS_COLORS = {
  "student-led": "#8fd0ff",
  event: "#c8f0cf",
  weekend: "#f3f3f3",
  compensatory: "#f6c8ab",
  "self-registration": "#dfeeff",
  "term-begin": "#ffb766",
  "term-end": "#d9b100",
  assessment: "#f8c7de",
  break: "#fff0a8",
  holiday: "#b98ad6",
  "results-day": "#1a3a66",
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