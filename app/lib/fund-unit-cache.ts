import type { FundUnit } from "./types";

export function replaceFundUnitInList(
  fundUnits: FundUnit[],
  updated: FundUnit,
): FundUnit[] {
  if (!updated._id) {
    return fundUnits;
  }

  return fundUnits.map((fundUnit) =>
    fundUnit._id === updated._id ? updated : fundUnit,
  );
}

export function appendFundUnitToList(
  fundUnits: FundUnit[],
  created: FundUnit,
): FundUnit[] {
  return [...fundUnits, created].sort((a, b) => a.name.localeCompare(b.name));
}

export function removeFundUnitFromList(
  fundUnits: FundUnit[],
  fundUnitId: string,
): FundUnit[] {
  return fundUnits.filter((fundUnit) => fundUnit._id !== fundUnitId);
}
