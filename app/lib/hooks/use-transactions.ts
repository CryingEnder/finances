import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Transaction } from "../types";

export const transactionsKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionsKeys.all, "list"] as const,
  list: (filters: string) =>
    [...transactionsKeys.lists(), { filters }] as const,
  details: () => [...transactionsKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionsKeys.details(), id] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parseTransaction = (value: unknown): Transaction => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid transaction payload");
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
  const normalizedMarket =
    "string" === typeof market ? market : "UNKNOWN";
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
    throw new Error("Invalid transaction payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid transaction payload");
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
    throw new Error("Invalid transactions payload");
  }

  return value.reduce<Transaction[]>((acc, item) => {
    try {
      acc.push(parseTransaction(item));
    } catch (error) {
      // Keep legacy rows from blanking the whole tab.
      console.warn("Skipping invalid transaction payload", error);
    }
    return acc;
  }, []);
};

const extractErrorMessage = (
  payload: unknown,
  fallback: string,
): string => {
  if ("object" !== typeof payload || null === payload) {
    return fallback;
  }

  const errorPayload = payload as ApiErrorPayload;
  const detailMessage = errorPayload.details?.[0]?.message;
  if ("string" === typeof detailMessage && detailMessage.length > 0) {
    return detailMessage;
  }

  if ("string" === typeof errorPayload.error && errorPayload.error.length > 0) {
    return errorPayload.error;
  }

  return fallback;
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch("/api/transactions");
    if (!response.ok) {
      throw new Error(
        `Failed to fetch transactions (${String(response.status)})`,
      );
    }

    const data: unknown = await response.json();
    return parseTransactions(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch transactions");
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

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to create transaction (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseTransaction(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create transaction");
  }
};

const updateTransaction = async ({
  _id,
  ...transaction
}: Transaction): Promise<Transaction> => {
  try {
    if (!_id) {
      throw new Error("Transaction ID is required");
    }

    const response = await fetch(`/api/transactions/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to update transaction (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseTransaction(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update transaction");
  }
};

const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to delete transaction (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete transaction");
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
      void queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionsKeys.lists() });
    },
  });
}
