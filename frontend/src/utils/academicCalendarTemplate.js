const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_PRIORITY = {
  "term-work": 1,
  weekend: 2,
  event: 3,
  "self-registration": 4,
  "term-begin": 5,
  "term-end": 5,
  break: 6,
  assessment: 7,
  holiday: 8
};

const DISPLAY_STATUS_LABELS = {
  event: "Student Led Activities",
  "self-registration": "Self Registration",
  "term-begin": "Term Begins",
  "term-end": "Term Ends",
  assessment: "Comprehensive Assessment",
  break: "Break",
  holiday: "Holiday"
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

const getDisplayLabel = (row, status) => {
  const remark = (row?.remarks || "").trim();
  if (isMeaningfulRemark(remark)) {
    return remark;
  }

  return DISPLAY_STATUS_LABELS[status] || remark || "";
};

const getDayNumber = (date) => String(date.getDate());

const formatRangeLabel = (startDate, endDate, labels) => {
  if (!startDate || !endDate) {
    return "";
  }

  const startDay = getDayNumber(startDate);
  const endDay = getDayNumber(endDate);
  
  let rangeText = "";
  if (startDay === endDay) {
    rangeText = `${startDay}`;
  } else {
    rangeText = `${startDay} to ${endDay}`;
  }

  if (Array.isArray(labels)) {
    return `${rangeText} ${labels.join(" and ")}`;
  }

  return `${rangeText} ${labels}`;
};

const mergeOverlappingEvents = (events) => {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startDate - b.startDate);
  const merged = [];

  let current = {
    startDate: sorted[0].startDate,
    endDate: sorted[0].endDate,
    labels: [sorted[0].displayLabel],
    statuses: [sorted[0].status]
  };

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    const oneDay = 24 * 60 * 60 * 1000;
    const dayBefore = new Date(next.startDate.getTime() - oneDay);

    if (next.startDate <= current.endDate || dayBefore <= current.endDate) {
      if (!current.labels.includes(next.displayLabel)) {
        current.labels.push(next.displayLabel);
      }
      if (!current.statuses.includes(next.status)) {
        current.statuses.push(next.status);
      }
      current.endDate = new Date(Math.max(current.endDate.getTime(), next.endDate.getTime()));
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

const detectStatus = (row, dayOfWeek) => {
  const text = `${row?.remarks || ""} ${row?.weekLabel || ""}`.toLowerCase();

  if (/holiday|festival|jayanti|bakrid|ram navami|good friday|bonalu|muharram/.test(text)) {
    return "holiday";
  }

  if (/assessment|exam|test/.test(text)) {
    return "assessment";
  }

  if (/term break|break/.test(text)) {
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

  if (/event|activity|induction|cultur|sports|national/.test(text)) {
    return "event";
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "weekend";
  }

  return "term-work";
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

    currentWeek[weekday] = {
      day: cursor,
      isoDate,
      status: statusByIso.get(isoDate) || (weekday === 0 || weekday === 6 ? "weekend" : "term-work")
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
    const candidate = detectStatus(row, dayOfWeek);
    const current = statusByIso.get(row.isoDate);

    if (!current || STATUS_PRIORITY[candidate] > STATUS_PRIORITY[current]) {
      statusByIso.set(row.isoDate, candidate);
    }

    const monthKey = `${row.parsedDate.getFullYear()}-${String(row.parsedDate.getMonth() + 1).padStart(2, "0")}`;
    const list = rowByMonth.get(monthKey) || [];
    list.push({
      ...row,
      status: candidate,
      displayLabel: getDisplayLabel(row, candidate)
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
      if (!row.displayLabel || row.status === "term-work" || row.status === "weekend") {
        if (activeGroup) {
          events.push(activeGroup);
          activeGroup = null;
        }
        return;
      }

      const previous = monthRows[index - 1];
      const isAdjacentDay = previous
        && previous.displayLabel === row.displayLabel
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
        displayLabel: row.displayLabel,
        status: row.status
      };
    });

    if (activeGroup) {
      events.push(activeGroup);
    }

    const mergedEvents = mergeOverlappingEvents(events).slice(0, 10);

    months.push({
      key,
      title: cursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      }).toUpperCase(),
      weeks: getMonthGrid(cursor, statusByIso),
      events: mergedEvents.map(e => ({
        rangeLabel: e.rangeLabel,
        displayLabel: e.labels.join(" and "),
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
      { key: "event", label: "Student Led Activities" },
      { key: "weekend", label: "Weekend" },
      { key: "self-registration", label: "Self Registration" },
      { key: "term-begin", label: "Term Begins" },
      { key: "term-end", label: "Term Ends" },
      { key: "assessment", label: "Assessment" },
      { key: "break", label: "Term Break" },
      { key: "holiday", label: "Holiday" }
    ]
  };
};