const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_PRIORITY = {
  "term-work": 1,
  weekend: 2,
  "student-led": 3,
  event: 4,
  compensatory: 5,
  "self-registration": 6,
  "term-begin": 7,
  "term-end": 8,
  "results-day": 9,
  break: 10,
  assessment: 11,
  holiday: 12
};

const DISPLAY_STATUS_LABELS = {
  "student-led": "Student Led Activities",
  event: "Events",
  compensatory: "Compensatory Working Day",
  "self-registration": "Self Registration",
  "term-begin": "Term Begins",
  "term-end": "Term Ends",
  "results-day": "Results Day",
  assessment: "Comprehensive Assessment",
  break: "Break",
  holiday: "Holiday"
};

const getStatusPriority = (status) => STATUS_PRIORITY[status] || 0;

const getSortedUniqueStatuses = (statuses = []) => {
  const uniqueStatuses = Array.from(new Set((statuses || []).filter(Boolean)));
  return uniqueStatuses.sort((left, right) => getStatusPriority(right) - getStatusPriority(left));
};

const parseIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatIso = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isMeaningfulRemark = (remark) => {
  const text = (remark || "").trim().toLowerCase();
  if (!text || text === "-") return false;

  if (text === "term work") {
    return false;
  }

  return true;
};

const isRenderableLabel = (label) => {
  const text = (label || "").trim();
  return Boolean(text) && text !== "-";
};

const getDisplayLabel = (row, status) => {
  const labels = [];
  
  const termBegin = Boolean(row?.isTermBegin);
  const termEnd = Boolean(row?.isTermEnd);
  const resultsDay = Boolean(row?.isResultsDay);
  const studentLedActivities = (row?.studentLedActivities || "").trim();
  const compensatory = (row?.compensatoryWorkingDay || "").trim();
  const holidays = (row?.holidays || "").trim();
  const events = (row?.events || "").trim();
  const remark = (row?.remarks || "").trim();

  // Collect all applicable labels instead of returning early
  if (termBegin) labels.push(DISPLAY_STATUS_LABELS["term-begin"]);
  if (termEnd) labels.push(DISPLAY_STATUS_LABELS["term-end"]);
  if (resultsDay) labels.push(DISPLAY_STATUS_LABELS["results-day"]);
  if (studentLedActivities) labels.push(DISPLAY_STATUS_LABELS["student-led"]);
  if (compensatory) labels.push(compensatory);
  if (holidays) labels.push(holidays);
  if (events) labels.push(events);
  
  if (labels.length > 0) {
    return labels.join(" and ");
  }
  
  if (isMeaningfulRemark(remark)) {
    return remark;
  }

  return DISPLAY_STATUS_LABELS[status] || "";
};

const getDayNumber = (date) => String(date.getDate());

const formatRangeLabel = (startDate, endDate, labels) => {
  if (!startDate || !endDate) {
    return "";
  }

  if (!labels || !Array.isArray(labels) || labels.length === 0) {
    return "";
  }

  const cleanLabels = labels.filter(isRenderableLabel);
  if (cleanLabels.length === 0) {
    return "";
  }

  const startDay = getDayNumber(startDate);
  const endDay = getDayNumber(endDate);
  
  let rangeText = "";
  if (startDay === endDay) {
    rangeText = `${startDay}`;
  } else {
    rangeText = `${startDay} - ${endDay}`;
  }

  return `${rangeText} ${cleanLabels.join(" and ")}`;
};

const mergeEventsWithSameRange = (events) => {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    if (a.startDate.getTime() !== b.startDate.getTime()) {
      return a.startDate - b.startDate;
    }
    return a.endDate - b.endDate;
  });
  const merged = [];

  let current = {
    startDate: sorted[0].startDate,
    endDate: sorted[0].endDate,
    labels: [sorted[0].displayLabel],
    statuses: [sorted[0].status]
  };

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];

    const hasSameRange =
      next.startDate.getTime() === current.startDate.getTime()
      && next.endDate.getTime() === current.endDate.getTime();

    if (hasSameRange) {
      if (!current.labels.includes(next.displayLabel)) {
        current.labels.push(next.displayLabel);
      }
      if (!current.statuses.includes(next.status)) {
        current.statuses.push(next.status);
      }
    } else {
      current.rangeLabel = formatRangeLabel(current.startDate, current.endDate, current.labels);
      merged.push(current);
      current = {
        startDate: next.startDate,
        endDate: next.endDate,
        labels: [next.displayLabel],
        statuses: [next.status]
      };
    }
  }

  current.rangeLabel = formatRangeLabel(current.startDate, current.endDate, current.labels);
  merged.push(current);

  return merged;
};

const mergeConsecutiveEventsWithSameLabels = (events) => {
  if (events.length === 0) return [];

  const oneDayMs = 24 * 60 * 60 * 1000;
  const getLabelKey = (labels) => [...labels].map((label) => label.toLowerCase()).sort().join("||");

  const merged = [];
  let current = {
    ...events[0],
    rangeLabel: formatRangeLabel(events[0].startDate, events[0].endDate, events[0].labels)
  };

  for (let i = 1; i < events.length; i += 1) {
    const next = events[i];
    const currentLabelKey = getLabelKey(current.labels);
    const nextLabelKey = getLabelKey(next.labels);
    const isConsecutive = current.endDate.getTime() + oneDayMs === next.startDate.getTime();

    if (isConsecutive && currentLabelKey === nextLabelKey) {
      current.endDate = next.endDate;
      current.rangeLabel = formatRangeLabel(current.startDate, current.endDate, current.labels);
    } else {
      merged.push(current);
      current = {
        ...next,
        rangeLabel: formatRangeLabel(next.startDate, next.endDate, next.labels)
      };
    }
  }

  merged.push(current);
  return merged;
};

const detectStatus = (row, dayOfWeek) => {
  if (row?.isTermBegin) {
    return "term-begin";
  }

  if (row?.isTermEnd) {
    return "term-end";
  }

  if (row?.isResultsDay) {
    return "results-day";
  }

  const studentLedActivities = (row?.studentLedActivities || "").toLowerCase();
  const compensatory = (row?.compensatoryWorkingDay || "").toLowerCase();
  const holidays = (row?.holidays || "").toLowerCase();
  const events = (row?.events || "").toLowerCase();
  const remarks = (row?.remarks || "").toLowerCase();
  const weekLabel = (row?.weekLabel || "").toLowerCase();
  
  const text = `${remarks} ${weekLabel}`.toLowerCase();
  const combinedActivityText = `${studentLedActivities} ${compensatory} ${holidays} ${events} ${text}`;

  if (studentLedActivities || /student led activities?|student activity/.test(combinedActivityText)) {
    return "student-led";
  }

  if (compensatory || /compensatory working day|compensatory/.test(combinedActivityText)) {
    return "compensatory";
  }

  if (holidays || /holiday|festival|jayanti|bakrid|ram navami|good friday|bonalu|muharram/.test(combinedActivityText)) {
    return "holiday";
  }

  if (/assessment|exam|test|comprehensive assessment/.test(combinedActivityText)) {
    return "assessment";
  }

  if (/term break|break/.test(combinedActivityText)) {
    return "break";
  }

  if (/self registration|registration/.test(text)) {
    return "self-registration";
  }

  if (/term begin|commencement|start of term/.test(text)) {
    return "term-begin";
  }

  if (/term end|end of term|declaration|result/.test(text)) {
    return "term-end";
  }

  if (events || /event|activity|induction|cultur|sports|national/.test(combinedActivityText)) {
    return "event";
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "weekend";
  }

  return "term-work";
};

const detectStatuses = (row, dayOfWeek) => {
  const statuses = [];

  if (row?.isTermBegin) {
    statuses.push("term-begin");
  }

  if (row?.isTermEnd) {
    statuses.push("term-end");
  }

  if (row?.isResultsDay) {
    statuses.push("results-day");
  }

  const studentLedActivities = (row?.studentLedActivities || "").toLowerCase();
  const compensatory = (row?.compensatoryWorkingDay || "").toLowerCase();
  const holidays = (row?.holidays || "").toLowerCase();
  const events = (row?.events || "").toLowerCase();
  const remarks = (row?.remarks || "").toLowerCase();
  const weekLabel = (row?.weekLabel || "").toLowerCase();
  const text = `${remarks} ${weekLabel}`.toLowerCase();
  const combinedActivityText = `${studentLedActivities} ${compensatory} ${holidays} ${events} ${text}`;

  if (studentLedActivities || /student led activities?|student activity/.test(combinedActivityText)) {
    statuses.push("student-led");
  }

  if (compensatory || /compensatory working day|compensatory/.test(combinedActivityText)) {
    statuses.push("compensatory");
  }

  if (holidays || /holiday|festival|jayanti|bakrid|ram navami|good friday|bonalu|muharram/.test(combinedActivityText)) {
    statuses.push("holiday");
  }

  if (/assessment|exam|test|comprehensive assessment/.test(combinedActivityText)) {
    statuses.push("assessment");
  }

  if (/term break|break/.test(combinedActivityText)) {
    statuses.push("break");
  }

  if (/results?\s*day|results day/.test(text)) {
    statuses.push("results-day");
  }

  if (/self registration|registration/.test(text)) {
    statuses.push("self-registration");
  }

  if (/term begin|commencement|start of term/.test(text)) {
    statuses.push("term-begin");
  }

  if (/term end|end of term|declaration/.test(text)) {
    statuses.push("term-end");
  }

  if (events || /event|activity|induction|cultur|sports|national/.test(combinedActivityText)) {
    statuses.push("event");
  }

  if (!statuses.length) {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      statuses.push("weekend");
    } else {
      statuses.push("term-work");
    }
  }

  return getSortedUniqueStatuses(statuses);
};

const getMonthGrid = (monthDate, statusByIso) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let currentWeek = Array(7).fill(null);

  for (let cursor = 1; cursor <= lastDate; cursor += 1) {
    const current = new Date(year, month, cursor);
    const weekday = current.getDay();
    const isoDate = formatIso(current);
    const defaultStatuses = weekday === 0 || weekday === 6 ? ["weekend"] : ["term-work"];
    const statuses = getSortedUniqueStatuses(statusByIso.get(isoDate) || defaultStatuses);

    currentWeek[weekday] = {
      day: cursor,
      isoDate,
      status: statuses[0] || (weekday === 0 || weekday === 6 ? "weekend" : "term-work"),
      statuses
    };

    if (weekday === 6 || cursor === lastDate) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
  }

  if (firstDay.getDay() > 0 && weeks.length > 0) {
    const firstWeek = weeks[0];
    const adjustedWeek = Array(7).fill(null);
    for (let weekday = firstDay.getDay(); weekday < 7; weekday += 1) {
      adjustedWeek[weekday] = firstWeek[weekday];
    }
    weeks[0] = adjustedWeek;
  }

  return weeks;
};

export const buildAcademicCalendarTemplateModel = ({ rows = [] }) => {
  const validRows = rows
    .filter((row) => parseIsoDate(row?.date))
    .map((row) => {
      const parsed = parseIsoDate(row.date);
      return {
        ...row,
        parsedDate: parsed,
        isoDate: formatIso(parsed)
      };
    })
    .sort((a, b) => a.parsedDate - b.parsedDate);

  if (!validRows.length) {
    return {
      weekdayLabels: WEEKDAY_LABELS,
      months: [],
      legend: [
        { key: "event", label: "Student Led Activities" },
        { key: "weekend", label: "Weekend" },
        { key: "self-registration", label: "Self Registration" },
        { key: "term-begin", label: "Term Begins" },
        { key: "term-end", label: "Term Ends" },
        { key: "results-day", label: "Results Day" },
        { key: "assessment", label: "Assessment" },
        { key: "break", label: "Term Break" },
        { key: "holiday", label: "Holiday" }
      ]
    };
  }

  const statusByIso = new Map();
  const rowByMonth = new Map();

  validRows.forEach((row) => {
    const dayOfWeek = row.parsedDate.getDay();
    const candidateStatuses = detectStatuses(row, dayOfWeek);
    const existingStatuses = statusByIso.get(row.isoDate) || [];
    statusByIso.set(row.isoDate, getSortedUniqueStatuses([...existingStatuses, ...candidateStatuses]));

    const monthKey = `${row.parsedDate.getFullYear()}-${String(row.parsedDate.getMonth() + 1).padStart(2, "0")}`;
    const list = rowByMonth.get(monthKey) || [];
    const primaryStatus = candidateStatuses[0] || "term-work";
    list.push({
      ...row,
      status: primaryStatus,
      displayLabel: getDisplayLabel(row, primaryStatus)
    });
    rowByMonth.set(monthKey, list);
  });

  const firstMonth = new Date(validRows[0].parsedDate.getFullYear(), validRows[0].parsedDate.getMonth(), 1);
  const lastMonth = new Date(
    validRows[validRows.length - 1].parsedDate.getFullYear(),
    validRows[validRows.length - 1].parsedDate.getMonth(),
    1
  );

  const months = [];
  const cursor = new Date(firstMonth);
  while (cursor <= lastMonth) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const monthRows = rowByMonth.get(key) || [];
    const events = [];
    let activeGroup = null;

    monthRows.forEach((row, index) => {
      const trimmedLabel = (row.displayLabel || "").trim();
      if (!trimmedLabel) {
        if (activeGroup) {
          events.push(activeGroup);
          activeGroup = null;
        }
        return;
      }

      const previous = monthRows[index - 1];
      const previousTrimmed = (previous?.displayLabel || "").trim();
      const isAdjacentDay = previous
        && previousTrimmed === trimmedLabel
        && previous.status === row.status
        && previous.parsedDate.getTime() + (24 * 60 * 60 * 1000) === row.parsedDate.getTime();

      if (activeGroup && isAdjacentDay) {
        activeGroup.endDate = row.parsedDate;
        return;
      }

      if (activeGroup) {
        events.push(activeGroup);
      }

      activeGroup = {
        startDate: row.parsedDate,
        endDate: row.parsedDate,
        displayLabel: trimmedLabel,
        status: row.status
      };
    });

    if (activeGroup) {
      events.push(activeGroup);
    }

    const mergedSameRangeEvents = mergeEventsWithSameRange(events);
    const mergedEvents = mergeConsecutiveEventsWithSameLabels(mergedSameRangeEvents);

    months.push({
      key,
      title: cursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      }).toUpperCase(),
      weeks: getMonthGrid(cursor, statusByIso),
      events: mergedEvents
        .map(e => {
          const cleanLabels = (e.labels || []).filter(label => label && label.trim());
          const newRangeLabel = formatRangeLabel(e.startDate, e.endDate, cleanLabels);
          return {
            ...e,
            cleanLabels,
            newRangeLabel
          };
        })
        .filter(e => e.cleanLabels && e.cleanLabels.length > 0 && e.newRangeLabel && e.newRangeLabel.trim())
        .map(e => ({
          rangeLabel: e.newRangeLabel,
          displayLabel: e.cleanLabels.join(" and "),
          startDate: e.startDate,
          endDate: e.endDate
        }))
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    weekdayLabels: WEEKDAY_LABELS,
    months,
    legend: [
      { key: "student-led", label: "Student Led Activities" },
      { key: "event", label: "Events" },
      { key: "weekend", label: "Weekend" },
      { key: "self-registration", label: "Self Registration" },
      { key: "term-begin", label: "Term Begins" },
      { key: "compensatory", label: "Compensatory Working Day" },
      { key: "term-end", label: "Term Ends" },
      { key: "results-day", label: "Results Day" },
      { key: "break", label: "Term Break" },
      { key: "assessment", label: "Assessment Week" },
      { key: "holiday", label: "Holidays" }
    ]
  };
};