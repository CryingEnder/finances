import { ro } from "date-fns/locale";
import {
  format,
  getYear,
  isAfter,
  isValid,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  return isValid(parseISO(value));
}

function parseIsoDate(iso: string): Date {
  return parseISO(iso);
}

export function todayIsoDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowIsoDateTime(): string {
  return new Date().toISOString();
}

export function currentYear(): number {
  return getYear(new Date());
}

export function getIsoYear(iso: string): number {
  return getYear(parseIsoDate(iso));
}

export function formatDisplayDate(iso: string): string {
  return format(parseIsoDate(iso), "P", { locale: ro });
}

export function parseIsoDateTime(iso: string): Date {
  return parseISO(iso);
}

export function isIsoDateTimeString(value: string): boolean {
  return isValid(parseISO(value));
}

export function toIsoDateOnly(iso: string): string {
  if (ISO_DATE_PATTERN.test(iso)) {
    return iso;
  }

  return format(parseIsoDateTime(iso), "yyyy-MM-dd");
}

export function combineDateOnlyWithCurrentTime(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const now = new Date();

  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ).toISOString();
}

export function combineDateOnlyWithTimeFrom(
  dateOnly: string,
  timeSourceIso: string,
): string {
  const [year, month, day] = dateOnly.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const timeSource = parseIsoDateTime(timeSourceIso);

  return new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  ).toISOString();
}

export function resolveFundUnitStatusDateTime(
  dateInput: string,
  existingIso?: string,
): string {
  if (!ISO_DATE_PATTERN.test(dateInput)) {
    return parseIsoDateTime(dateInput).toISOString();
  }

  if (existingIso) {
    if (toIsoDateOnly(existingIso) === dateInput) {
      return parseIsoDateTime(existingIso).toISOString();
    }

    return combineDateOnlyWithTimeFrom(dateInput, existingIso);
  }

  return combineDateOnlyWithCurrentTime(dateInput);
}

export function normalizeFundUnitStatusDateTime(value: string): string {
  if (ISO_DATE_PATTERN.test(value)) {
    return combineDateOnlyWithCurrentTime(value);
  }

  return parseIsoDateTime(value).toISOString();
}

export function isIsoDateAfter(laterIso: string, earlierIso: string): boolean {
  return isAfter(parseIsoDate(laterIso), parseIsoDate(earlierIso));
}

export function daysSinceIsoDate(iso: string): number {
  return differenceInCalendarDays(new Date(), parseIsoDate(iso));
}

export function daysUntilIsoDate(iso: string): number {
  return differenceInCalendarDays(parseIsoDate(iso), new Date());
}
