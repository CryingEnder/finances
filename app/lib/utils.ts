import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function formatPrice(value: number, maxDecimals = 4): string {
  const rounded =
    Math.round(value * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);

  // Use fixed decimals first so whole numbers like 10 are "10.0000", not "10"
  // (otherwise /\.?0+$/ would strip the tens digit and show "1").
  const formatted = rounded.toFixed(maxDecimals).replace(/\.?0+$/, "");
  return "" === formatted ? "0" : formatted;
}
