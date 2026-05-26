export const TAB_COLORS = {
  deposits: "#14b8a6",
  stocks: "#0ea5e9",
  etfs: "#6366f1",
  fundUnits: "#16a34a",
  dividends: "#f97316",
  profit: "#84cc16",
  loss: "#f87171",
} as const;

export const TAB_BUTTON_CLASS = {
  deposits: "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer",
  stocks: "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer",
  stocksDark: "bg-sky-800 hover:bg-sky-900 text-white cursor-pointer",
  etfs: "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer",
  fundUnits: "bg-green-600 hover:bg-green-700 text-white cursor-pointer",
  dividends: "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer",
} as const;

export const TAB_ICON_CLASS = {
  deposits: "text-teal-400",
  stocks: "text-sky-400",
  etfs: "text-indigo-400",
  fundUnits: "text-green-500",
  dividends: "text-orange-500",
} as const;
