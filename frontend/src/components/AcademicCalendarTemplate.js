import "./AcademicCalendarTemplate.css";

function AcademicCalendarTemplate({ headingLines = [], model, compact = false }) {
  const safeModel = model || { months: [], weekdayLabels: [], legend: [] };

  return (
    <section className={`calendarTemplateSheet ${compact ? "compact" : ""}`}>
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