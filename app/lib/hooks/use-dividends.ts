import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Dividend } from "../types";

import { isIsoDateString } from "../dates";
import { API_ERROR_CODES } from "../api-error-codes";
import { ApiRequestError } from "../api-request-error";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const dividendsKeys = {
  all: ["dividends"] as const,
  lists: () => [...dividendsKeys.all, "list"] as const,
};

const parseDividend = (value: unknown): Dividend => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const amount = payload.amount;
  const instrument = payload.instrument;
  const isin = payload.isin;
  const issuer = payload.issuer;
  const notes = payload.notes;
  const id = payload._id;
  const dateRaw = payload.date;

  if (
    "string" !== typeof dateRaw ||
    !isIsoDateString(dateRaw) ||
    "number" !== typeof amount ||
    "string" !== typeof instrument ||
    "string" !== typeof isin ||
    "string" !== typeof issuer
  ) {
    throwInvalidPayload();
  }

  if (undefined !== notes && "string" !== typeof notes) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    instrument,
    isin,
    issuer,
    date: dateRaw,
    amount,
    ...(undefined !== notes && notes.length > 0 ? { notes } : {}),
  };
};

const parseDividends = (value: unknown): Dividend[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.reduce<Dividend[]>((acc, item) => {
    try {
      acc.push(parseDividend(item));
    } catch (error) {
      console.warn("Skipping invalid dividend payload", error);
    }
    return acc;
  }, []);
};

const fetchDividends = async (): Promise<Dividend[]> => {
  try {
    const response = await fetch("/api/dividends");
    await assertOkResponse(response, API_ERROR_CODES.failedFetchDividends);

    const data: unknown = await response.json();
    return parseDividends(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createDividend = async (
  dividend: Omit<Dividend, "_id">,
): Promise<Dividend> => {
  try {
    const response = await fetch("/api/dividends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dividend),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedCreateDividend);

    const data: unknown = await response.json();
    return parseDividend(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateDividend = async ({
  _id,
  ...dividend
}: Dividend): Promise<Dividend> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/dividends/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dividend),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedUpdateDividend);

    const data: unknown = await response.json();
    return parseDividend(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteDividend = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/dividends/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(response, API_ERROR_CODES.failedDeleteDividend);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function useDividends() {
  return useQuery({
    queryKey: dividendsKeys.lists(),
    queryFn: fetchDividends,
  });
}

export function useCreateDividend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDividend,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dividendsKeys.lists() });
    },
  });
}

export function useUpdateDividend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDividend,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dividendsKeys.lists() });
    },
  });
}

export function useDeleteDividend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDividend,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dividendsKeys.lists() });
    },
  });
}
