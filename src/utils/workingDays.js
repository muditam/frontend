const NATIONAL_HOLIDAYS = new Set(["01-26", "08-15", "10-02"]);

const toMonthDay = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export function isWorkingDay(date) {
  return date.getDay() !== 0 && !NATIONAL_HOLIDAYS.has(toMonthDay(date));
}

export function getRemainingWorkingDays(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let day = today.getDate(); day <= lastDate; day += 1) {
    if (isWorkingDay(new Date(year, month, day))) count += 1;
  }

  return count;
}
