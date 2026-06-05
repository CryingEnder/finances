import type { ObjectId } from "mongodb";

import type { Etf, EtfTransaction } from "./types";
import type { DatabaseEtf, DatabaseEtfTransaction } from "./database";

export function serializeEtfTransaction(
  transaction: DatabaseEtfTransaction,
): EtfTransaction {
  return {
    _id: transaction._id?.toString(),
    type: transaction.type,
    volume: transaction.volume,
    actualPrice: transaction.actualPrice,
    openingPrice: transaction.openingPrice,
    createdAt: transaction.createdAt,
  };
}

export function serializeEtfStatuses(
  statuses: DatabaseEtfTransaction[] | undefined,
): EtfTransaction[] {
  return (statuses ?? []).map(serializeEtfTransaction);
}

export function serializeEtf(etf: DatabaseEtf & { _id: ObjectId }): Etf {
  return {
    _id: etf._id.toString(),
    symbol: etf.symbol,
    label: etf.label,
    currency: etf.currency,
    statuses: serializeEtfStatuses(etf.statuses),
  };
}

export function etfIdentityMatches(
  etf: Pick<Etf, "symbol" | "label">,
  symbol: string,
  label: string,
): boolean {
  return etf.symbol === symbol && etf.label === label;
}
