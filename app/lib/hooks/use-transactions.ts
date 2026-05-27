import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Transaction } from "../types";

import { API_ERROR_CODES } from "../api-error-codes";
import { captureClientError } from "../capture-error";
import { ApiRequestError } from "../api-request-error";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const transactionsKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionsKeys.all, "list"] as const,
  list: (filters: string) =>
    [...transactionsKeys.lists(), { filters }] as const,
  details: () => [...transactionsKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionsKeys.details(), id] as const,
};

const parseTransaction = (value: unknown): Transaction => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const transactionDate = payload.transactionDate;
  const settlementDate = payload.settlementDate;
  const type = payload.type;
  const symbol = payload.symbol;
  const isin = payload.isin;
  const issuer = payload.issuer;
  const quantity = payload.quantity;
  const unitPrice = payload.unitPrice;
  const grossAmount = payload.grossAmount;
  const bcrCommission = payload.bcrCommission;
  const settlementCommission = payload.settlementCommission;
  const otherFees = payload.otherFees;
  const externalCosts = payload.externalCosts;
  const netAmount = payload.netAmount;
  const realizedProfit = payload.realizedProfit;
  const realizedProfitCCY = payload.realizedProfitCCY;
  const taxWithheld = payload.taxWithheld;
  const market = payload.market;
  const currency = payload.currency;
  const id = payload._id;
  const normalizedMarket = "string" === typeof market ? market : "UNKNOWN";
  const normalizedCurrency = "RON" === currency ? "RON" : "RON";

  if (
    "string" !== typeof transactionDate ||
    "string" !== typeof settlementDate ||
    ("BUY" !== type && "SELL" !== type) ||
    "string" !== typeof symbol ||
    "string" !== typeof isin ||
    "string" !== typeof issuer ||
    "number" !== typeof quantity ||
    "number" !== typeof unitPrice ||
    "number" !== typeof grossAmount ||
    "number" !== typeof bcrCommission ||
    "number" !== typeof settlementCommission ||
    "number" !== typeof otherFees ||
    "number" !== typeof externalCosts ||
    "number" !== typeof netAmount ||
    ("number" !== typeof realizedProfit &&
      undefined !== realizedProfit &&
      null !== realizedProfit) ||
    ("number" !== typeof realizedProfitCCY &&
      undefined !== realizedProfitCCY &&
      null !== realizedProfitCCY) ||
    ("number" !== typeof taxWithheld &&
      undefined !== taxWithheld &&
      null !== taxWithheld)
  ) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    transactionDate,
    settlementDate,
    type,
    symbol,
    isin,
    issuer,
    quantity,
    unitPrice,
    grossAmount,
    bcrCommission,
    settlementCommission,
    otherFees,
    externalCosts,
    netAmount,
    realizedProfit:
      "number" === typeof realizedProfit ? realizedProfit : undefined,
    realizedProfitCCY:
      "number" === typeof realizedProfitCCY ? realizedProfitCCY : undefined,
    taxWithheld: "number" === typeof taxWithheld ? taxWithheld : undefined,
    market: normalizedMarket,
    currency: normalizedCurrency,
  };
};

const parseTransactions = (value: unknown): Transaction[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.reduce<Transaction[]>((acc, item) => {
    try {
      acc.push(parseTransaction(item));
    } catch (error) {
      captureClientError(error, {
        message: "Invalid transaction payload from API",
      });
    }
    return acc;
  }, []);
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch("/api/transactions");
    await assertOkResponse(response, API_ERROR_CODES.failedFetchTransactions);

    const data: unknown = await response.json();
    return parseTransactions(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createTransaction = async (
  transaction: Omit<Transaction, "_id">,
): Promise<Transaction> => {
  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedCreateTransaction);

    const data: unknown = await response.json();
    return parseTransaction(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateTransaction = async ({
  _id,
  ...transaction
}: Transaction): Promise<Transaction> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/transactions/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedUpdateTransaction);

    const data: unknown = await response.json();
    return parseTransaction(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(response, API_ERROR_CODES.failedDeleteTransaction);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function useTransactions() {
  return useQuery({
    queryKey: transactionsKeys.lists(),
    queryFn: fetchTransactions,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transactionsKeys.lists(),
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transactionsKeys.lists(),
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transactionsKeys.lists(),
      });
    },
  });
}
