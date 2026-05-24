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

export function currentYear(): number {
  return getYear(new Date());
}

export function getIsoYear(iso: string): number {
  return getYear(parseIsoDate(iso));
}

export function formatDisplayDate(iso: string): string {
  return format(parseIsoDate(iso), "P", { locale: ro });
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
