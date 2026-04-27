const HEALTH_SCIENCES_CANONICAL = "School of Health Sciences";
const HEALTH_SCIENCE_ALIAS = "school of health science";

const normalizeSpaces = (value) => String(value || "").replace(/\s+/g, " ").trim();

const canonicalizeSchoolName = (value) => {
  const trimmed = normalizeSpaces(value);
  if (!trimmed) return "";

  if (trimmed.toLowerCase() === HEALTH_SCIENCE_ALIAS) {
    return HEALTH_SCIENCES_CANONICAL;
  }

  return trimmed;
};

module.exports = {
  HEALTH_SCIENCES_CANONICAL,
  canonicalizeSchoolName
};