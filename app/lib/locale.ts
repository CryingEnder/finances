export const APP_LOCALES = ["en", "ro"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export function normalizeAppLocale(value: string | undefined): AppLocale {
  if (value && APP_LOCALES.includes(value as AppLocale)) {
    return value as AppLocale;
  }
  return "en";
}
