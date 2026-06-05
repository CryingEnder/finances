import type { ObjectId } from "mongodb";

import type { FundUnit, TradeType, FundUnitStatus } from "./types";
import type { DatabaseFundUnit, DatabaseFundUnitStatus } from "./database";

import {
  toIsoDateOnly,
  isIsoDateTimeString,
  resolveFundUnitStatusDateTime,
} from "./dates";

function normalizeOptionalDate(value: unknown): string | undefined {
  return "string" === typeof value && value.length > 0 ? value : undefined;
}

function normalizeOptionalCreatedAt(value: unknown): string | undefined {
  if ("string" === typeof value && value.length > 0) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

function resolveStatusDate(date: unknown, createdAt: unknown): string {
  const timeSource = normalizeOptionalCreatedAt(createdAt);

  if ("string" === typeof date && date.length > 0) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return resolveFundUnitStatusDateTime(date, timeSource);
    }

    if (isIsoDateTimeString(date)) {
      return resolveFundUnitStatusDateTime(toIsoDateOnly(date), date);
    }
  }

  return timeSource ?? "1970-01-01T00:00:00.000Z";
}

export function serializeFundUnitStatus(
  status: DatabaseFundUnitStatus,
): FundUnitStatus {
  return {
    _id: status._id?.toString(),
    type: status.type,
    date: resolveStatusDate(status.date, status.createdAt),
    totalValue: status.totalValue,
    profit: status.profit,
    createdAt: normalizeOptionalCreatedAt(status.createdAt),
  };
}

export function serializeFundUnitStatuses(
  statuses: DatabaseFundUnitStatus[] | undefined,
): FundUnitStatus[] {
  return (statuses ?? []).map(serializeFundUnitStatus);
}

type LegacyDatabaseFundUnit = DatabaseFundUnit & {
  type?: TradeType;
  totalValue?: number;
  profit?: number;
};

function resolveSerializedStatuses(
  fundUnit: LegacyDatabaseFundUnit,
): FundUnitStatus[] {
  const statuses = serializeFundUnitStatuses(fundUnit.statuses);
  if (statuses.length > 0) {
    return statuses;
  }

  if (
    fundUnit.type &&
    fundUnit.totalValue !== undefined &&
    fundUnit.profit !== undefined
  ) {
    const fallbackDate = normalizeOptionalDate(
      fundUnit.openedDate ?? fundUnit.date,
    );

    return [
      serializeFundUnitStatus({
        type: fundUnit.type,
        totalValue: fundUnit.totalValue,
        profit: fundUnit.profit,
        date: fallbackDate ?? "1970-01-01",
      }),
    ];
  }

  return [];
}

export function serializeFundUnit(
  fundUnit: DatabaseFundUnit & { _id: ObjectId },
): FundUnit {
  const legacyFundUnit = fundUnit as LegacyDatabaseFundUnit;

  return {
    _id: fundUnit._id.toString(),
    name: fundUnit.name,
    openedDate: fundUnit.openedDate,
    bondsPercent: fundUnit.bondsPercent,
    currency: fundUnit.currency,
    date: normalizeOptionalDate(fundUnit.date),
    statuses: resolveSerializedStatuses(legacyFundUnit),
  };
}

export function fundUnitIdentityMatches(
  fundUnit: Pick<FundUnit, "name">,
  name: string,
): boolean {
  return fundUnit.name === name;
}
