import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Etf, TradeType, EtfTransaction } from "../types";

import { resolveCurrency } from "../currency";
import { resolveTradeType } from "../validation";
import { API_ERROR_CODES } from "../api-error-codes";
import { captureClientError } from "../capture-error";
import { ApiRequestError } from "../api-request-error";
import {
  appendEtfToList,
  replaceEtfInList,
  removeEtfFromList,
} from "../etf-cache";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const etfsKeys = {
  all: ["etfs"] as const,
  lists: () => [...etfsKeys.all, "list"] as const,
};

const parseEtfTransaction = (value: unknown): EtfTransaction => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const type = payload.type;
  const volume = payload.volume;
  const actualPrice = payload.actualPrice;
  const openingPrice = payload.openingPrice;
  const createdAt = payload.createdAt;
  const id = payload._id;

  if (
    "number" !== typeof volume ||
    "number" !== typeof actualPrice ||
    "number" !== typeof openingPrice ||
    "string" !== typeof createdAt
  ) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    type: resolveTradeType(type),
    volume,
    actualPrice,
    openingPrice,
    createdAt,
  };
};

const parseEtfTransactions = (value: unknown): EtfTransaction[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.flatMap((item) => {
    try {
      return [parseEtfTransaction(item)];
    } catch (error) {
      captureClientError(error, {
        message: "Invalid ETF transaction payload from API",
      });
      return [];
    }
  });
};

const parseEtf = (value: unknown): Etf => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const symbol = payload.symbol;
  const label = payload.label;
  const currency = payload.currency;
  const statuses = payload.statuses;
  const id = payload._id;

  if ("string" !== typeof symbol || "string" !== typeof label) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    symbol,
    label,
    currency: resolveCurrency(currency, "EUR"),
    statuses: parseEtfTransactions(
      Array.isArray(statuses) ? statuses : [],
    ),
  };
};

const parseEtfs = (value: unknown): Etf[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.flatMap((item) => {
    try {
      return [parseEtf(item)];
    } catch (error) {
      captureClientError(error, {
        message: "Invalid ETF payload from API",
      });
      return [];
    }
  });
};

const fetchEtfs = async (): Promise<Etf[]> => {
  try {
    const response = await fetch("/api/etfs");
    await assertOkResponse(response, API_ERROR_CODES.failedFetchEtfs);

    const data: unknown = await response.json();
    return parseEtfs(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export type CreateEtfInput = Pick<Etf, "symbol" | "label" | "currency">;

export type UpdateEtfInput = Pick<Etf, "_id" | "label" | "currency">;

export interface CreateEtfTransactionInput {
  etfId: string;
  symbol: string;
  label: string;
  type: TradeType;
  volume: number;
  actualPrice: number;
  openingPrice: number;
}

export interface UpdateEtfTransactionInput {
  etfId: string;
  transactionId: string;
  type: TradeType;
  volume: number;
  actualPrice: number;
  openingPrice: number;
}

export interface DeleteEtfTransactionInput {
  etfId: string;
  transactionId: string;
}

const createEtf = async (etf: CreateEtfInput): Promise<Etf> => {
  try {
    const response = await fetch("/api/etfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(etf),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedCreateEtf);

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateEtf = async ({ _id, label, currency }: UpdateEtfInput): Promise<Etf> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/etfs/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, currency }),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedUpdateEtf);

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteEtf = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/etfs/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(response, API_ERROR_CODES.failedDeleteEtf);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createEtfTransaction = async ({
  etfId,
  symbol,
  label,
  type,
  volume,
  actualPrice,
  openingPrice,
}: CreateEtfTransactionInput): Promise<Etf> => {
  try {
    const response = await fetch(`/api/etfs/${etfId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        label,
        type,
        volume,
        actualPrice,
        openingPrice,
      }),
    });

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedCreateEtfTransaction,
    );

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateEtfTransaction = async ({
  etfId,
  transactionId,
  type,
  volume,
  actualPrice,
  openingPrice,
}: UpdateEtfTransactionInput): Promise<Etf> => {
  try {
    const response = await fetch(
      `/api/etfs/${etfId}/transactions/${transactionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, volume, actualPrice, openingPrice }),
      },
    );

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedUpdateEtfTransaction,
    );

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteEtfTransaction = async ({
  etfId,
  transactionId,
}: DeleteEtfTransactionInput): Promise<Etf> => {
  try {
    const response = await fetch(
      `/api/etfs/${etfId}/transactions/${transactionId}`,
      {
        method: "DELETE",
      },
    );

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedDeleteEtfTransaction,
    );

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function useEtfs() {
  return useQuery({
    queryKey: etfsKeys.lists(),
    queryFn: fetchEtfs,
  });
}

const updateEtfsListCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: Etf[]) => Etf[],
) => {
  queryClient.setQueryData<Etf[]>(etfsKeys.lists(), (current) => {
    if (!current) {
      return current;
    }
    return updater(current);
  });
};

export function useCreateEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEtf,
    onSuccess: (created) => {
      updateEtfsListCache(queryClient, (current) =>
        appendEtfToList(current, created),
      );
    },
  });
}

export function useUpdateEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEtf,
    onSuccess: (updated) => {
      updateEtfsListCache(queryClient, (current) =>
        replaceEtfInList(current, updated),
      );
    },
  });
}

export function useDeleteEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEtf,
    onSuccess: (_data, id) => {
      updateEtfsListCache(queryClient, (current) =>
        removeEtfFromList(current, id),
      );
    },
  });
}

export function useCreateEtfTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEtfTransaction,
    onSuccess: (updated) => {
      updateEtfsListCache(queryClient, (current) =>
        replaceEtfInList(current, updated),
      );
    },
  });
}

export function useUpdateEtfTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEtfTransaction,
    onSuccess: (updated) => {
      updateEtfsListCache(queryClient, (current) =>
        replaceEtfInList(current, updated),
      );
    },
  });
}

export function useDeleteEtfTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEtfTransaction,
    onSuccess: (updated) => {
      updateEtfsListCache(queryClient, (current) =>
        replaceEtfInList(current, updated),
      );
    },
  });
}
