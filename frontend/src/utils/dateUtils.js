export const isMonday = (date) => {
  return new Date(date).getDay() === 1;
};

export const isSunday = (date) => {
  return new Date(date).getDay() === 0;
};

export const getNextMonday = (date) => {
  let d = new Date(date);
  let day = d.getDay();
  let diff = (8 - day) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
};

export const addWeeks = (date, weeks) => {
  let d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};