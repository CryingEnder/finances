import type { Etf } from "./types";

export function replaceEtfInList(etfs: Etf[], updated: Etf): Etf[] {
  if (!updated._id) {
    return etfs;
  }

  return etfs.map((etf) => (etf._id === updated._id ? updated : etf));
}

export function appendEtfToList(etfs: Etf[], created: Etf): Etf[] {
  return [...etfs, created].sort((a, b) => a.label.localeCompare(b.label));
}

export function removeEtfFromList(etfs: Etf[], etfId: string): Etf[] {
  return etfs.filter((etf) => etf._id !== etfId);
}
