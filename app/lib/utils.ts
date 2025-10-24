import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid MongoDB ObjectId format
 * @param id - The string to validate
 * @returns true if valid ObjectId format, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Formats a number to show only meaningful decimal places (max 4)
 * @param value - The number to format
 * @param maxDecimals - Maximum number of decimal places (default: 4)
 * @returns Formatted string without trailing zeros
 */
export function formatPrice(value: number, maxDecimals: number = 4): string {
  // Round to maxDecimals to avoid floating point precision issues
  const rounded =
    Math.round(value * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);

  // Convert to string and remove trailing zeros, but keep at least "0" for zero values
  const formatted = rounded.toString().replace(/\.?0+$/, "");
  return formatted === "" ? "0" : formatted;
}
