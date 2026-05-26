import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Etf } from "../types";

import { resolveCurrency } from "../currency";
import { API_ERROR_CODES } from "../api-error-codes";
import { ApiRequestError } from "../api-request-error";

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

const parseEtf = (value: unknown): Etf => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const symbol = payload.symbol;
  const label = payload.label;
  const volume = payload.volume;
  const actualPrice = payload.actualPrice;
  const openingPrice = payload.openingPrice;
  const currency = payload.currency;
  const date = payload.date;
  const id = payload._id;

  if (
    "string" !== typeof symbol ||
    "string" !== typeof label ||
    "number" !== typeof volume ||
    "number" !== typeof actualPrice ||
    "number" !== typeof openingPrice
  ) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    symbol,
    label,
    volume,
    actualPrice,
    openingPrice,
    currency: resolveCurrency(currency, "EUR"),
    date: "string" === typeof date && date.length > 0 ? date : undefined,
  };
};

const parseEtfs = (value: unknown): Etf[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.reduce<Etf[]>((acc, item) => {
    try {
      acc.push(parseEtf(item));
    } catch (error) {
      console.warn("Skipping invalid ETF payload", error);
    }
    return acc;
  }, []);
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

const etfRequestBody = ({
  symbol,
  label,
  volume,
  actualPrice,
  openingPrice,
  currency,
}: Omit<Etf, "_id" | "date">) => ({
  symbol,
  label,
  volume,
  actualPrice,
  openingPrice,
  currency,
});

const createEtf = async (etf: Omit<Etf, "_id" | "date">): Promise<Etf> => {
  try {
    const response = await fetch("/api/etfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(etfRequestBody(etf)),
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

const updateEtf = async ({
  _id,
  symbol,
  label,
  volume,
  actualPrice,
  openingPrice,
  currency,
}: Etf): Promise<Etf> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/etfs/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        etfRequestBody({
          symbol,
          label,
          volume,
          actualPrice,
          openingPrice,
          currency,
        }),
      ),
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

export function useEtfs() {
  return useQuery({
    queryKey: etfsKeys.lists(),
    queryFn: fetchEtfs,
  });
}

export function useCreateEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEtf,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: etfsKeys.lists() });
    },
  });
}

export function useUpdateEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEtf,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: etfsKeys.lists() });
    },
  });
}

export function useDeleteEtf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEtf,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: etfsKeys.lists() });
    },
  });
}
