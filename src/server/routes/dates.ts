import { ApiError } from "./http.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;

// Returns today's local calendar date for historical shop events.
export function today() {
  const currentDate = new Date();
  const timezoneOffset = currentDate.getTimezoneOffset() * 60_000;
  return new Date(currentDate.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

// Accepts a valid YYYY-MM-DD date or supplies today's date when optional.
export function parseDate(value: unknown, fieldName: string, optional = false) {
  if (value === undefined && optional) return today();
  if (typeof value !== "string" || !datePattern.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ApiError(400, "Invalid date", `${fieldName} must use YYYY-MM-DD format.`);
  }
  return value;
}

// Builds an inclusive/exclusive month range so recoveries remain in their actual recovery month.
export function parseMonth(value: unknown) {
  if (typeof value !== "string" || !monthPattern.test(value)) {
    throw new ApiError(400, "Invalid month", "month must use YYYY-MM format.");
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month < 1 || month > 12) {
    throw new ApiError(400, "Invalid month", "month must use YYYY-MM format.");
  }

  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return { start: `${value}-01`, end: `${nextMonth}-01` };
}
