const YEAR_BAND_PALETTES = {
  1: ["#e8d07a"],
  2: ["#a7bdd9", "#dfb6bf"],
  3: ["#e2c24f", "#c3a8cb", "#a8ceb8"],
  4: ["#e2c24f", "#c3a8cb", "#a8ceb8", "#a7bdd9"],
  5: ["#e2c24f", "#c3a8cb", "#a8ceb8", "#a7bdd9", "#dfb6bf"]
};

const FALLBACK_PALETTE = YEAR_BAND_PALETTES[4];

export const getYearBandColor = (totalYears, yearIndex) => {
  const normalizedTotalYears = Number(totalYears);
  const normalizedYearIndex = Number(yearIndex);

  if (!Number.isInteger(normalizedYearIndex) || normalizedYearIndex < 0) {
    return FALLBACK_PALETTE[0];
  }

  const palette = YEAR_BAND_PALETTES[normalizedTotalYears] || FALLBACK_PALETTE;
  return palette[normalizedYearIndex % palette.length] || FALLBACK_PALETTE[0];
};
