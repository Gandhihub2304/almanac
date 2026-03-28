export const YEAR_OPTIONS = [1, 2, 3, 4, 5];

export const getYearLabels = (totalYears) => {
  const yearCount = Number(totalYears);

  if (!Number.isInteger(yearCount) || yearCount <= 0) {
    return [];
  }

  if (yearCount === 2) {
    return ["Junior", "Senior"];
  }

  if (yearCount === 5) {
    return ["Freshman", "Sophomore", "Junior", "Senior 1", "Senior 2"];
  }

  const defaultLabels = ["Freshman", "Sophomore", "Junior", "Senior"];

  return Array.from({ length: yearCount }, (_, index) => (
    defaultLabels[index] || `Year ${index + 1}`
  ));
};
