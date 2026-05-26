import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { PortfolioEntry } from "../types";

import { API_ERROR_CODES } from "../api-error-codes";
import { ApiRequestError } from "../api-request-error";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const portfolioKeys = {
  all: ["portfolio"] as const,
  lists: () => [...portfolioKeys.all, "list"] as const,
  list: (filters: string) => [...portfolioKeys.lists(), { filters }] as const,
  details: () => [...portfolioKeys.all, "detail"] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
};

const parsePortfolioEntry = (value: unknown): PortfolioEntry => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const date = payload.date;
  const currency = payload.currency;
  const instrument = payload.instrument;
  const isin = payload.isin;
  const issuer = payload.issuer;
  const quantity = payload.quantity;
  const locked = payload.locked;
  const averagePrice = payload.averagePrice;
  const referencePrice = payload.referencePrice;
  const id = payload._id;

  if (
    "string" !== typeof date ||
    "RON" !== currency ||
    "string" !== typeof instrument ||
    "string" !== typeof isin ||
    "string" !== typeof issuer ||
    "number" !== typeof quantity ||
    "number" !== typeof locked ||
    "number" !== typeof averagePrice ||
    "number" !== typeof referencePrice
  ) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    date,
    currency,
    instrument,
    isin,
    issuer,
    quantity,
    locked,
    averagePrice,
    referencePrice,
  };
};

const parsePortfolioEntries = (value: unknown): PortfolioEntry[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.map((item) => parsePortfolioEntry(item));
};

const fetchPortfolioEntries = async (): Promise<PortfolioEntry[]> => {
  try {
    const response = await fetch("/api/portfolio");
    await assertOkResponse(
      response,
      API_ERROR_CODES.failedFetchPortfolioEntries,
    );

    const data: unknown = await response.json();
    return parsePortfolioEntries(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createPortfolioEntry = async (
  entry: Omit<PortfolioEntry, "_id">,
): Promise<PortfolioEntry> => {
  try {
    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedCreatePortfolioEntry,
    );

    const data: unknown = await response.json();
    return parsePortfolioEntry(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updatePortfolioEntry = async ({
  _id,
  ...entry
}: PortfolioEntry): Promise<PortfolioEntry> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/portfolio/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedUpdatePortfolioEntry,
    );

    const data: unknown = await response.json();
    return parsePortfolioEntry(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deletePortfolioEntry = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/portfolio/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedDeletePortfolioEntry,
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function usePortfolioEntries() {
  return useQuery({
    queryKey: portfolioKeys.lists(),
    queryFn: fetchPortfolioEntries,
  });
}

export function useCreatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPortfolioEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useUpdatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePortfolioEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useDeletePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePortfolioEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}
