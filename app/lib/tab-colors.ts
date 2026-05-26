/** Canonical -600 shade per tab (pies, icons, and primary buttons). */
export const TAB_COLORS = {
  deposits: "#0d9488",
  stocks: "#0284c7",
  etfs: "#4f46e5",
  fundUnits: "#16a34a",
  dividends: "#d97706",
  bonds: "#1e40af",
  profit: "#84cc16",
  loss: "#f87171",
} as const;

export const TAB_BUTTON_CLASS = {
  deposits: "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer",
  stocks: "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer",
  stocksDark: "bg-sky-800 hover:bg-sky-900 text-white cursor-pointer",
  etfs: "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer",
  fundUnits: "bg-green-600 hover:bg-green-700 text-white cursor-pointer",
  dividends: "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer",
} as const;

export const TAB_ICON_CLASS = {
  deposits: "text-teal-600",
  stocks: "text-sky-600",
  etfs: "text-indigo-600",
  fundUnits: "text-green-600",
  dividends: "text-amber-600",
} as const;
