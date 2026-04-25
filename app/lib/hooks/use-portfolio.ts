import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { PortfolioEntry } from "../types";

export const portfolioKeys = {
  all: ["portfolio"] as const,
  lists: () => [...portfolioKeys.all, "list"] as const,
  list: (filters: string) => [...portfolioKeys.lists(), { filters }] as const,
  details: () => [...portfolioKeys.all, "detail"] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parsePortfolioEntry = (value: unknown): PortfolioEntry => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid portfolio entry payload");
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
    throw new Error("Invalid portfolio entry payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid portfolio entry payload");
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
    throw new Error("Invalid portfolio entries payload");
  }

  return value.map((item) => parsePortfolioEntry(item));
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

const fetchPortfolioEntries = async (): Promise<PortfolioEntry[]> => {
  try {
    const response = await fetch("/api/portfolio");
    if (!response.ok) {
      throw new Error(
        `Failed to fetch portfolio entries (${String(response.status)})`,
      );
    }

    const data: unknown = await response.json();
    return parsePortfolioEntries(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch portfolio entries");
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

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to create portfolio entry (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parsePortfolioEntry(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create portfolio entry");
  }
};

const updatePortfolioEntry = async ({
  _id,
  ...entry
}: PortfolioEntry): Promise<PortfolioEntry> => {
  try {
    if (!_id) {
      throw new Error("Portfolio entry ID is required");
    }

    const response = await fetch(`/api/portfolio/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to update portfolio entry (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parsePortfolioEntry(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update portfolio entry");
  }
};

const deletePortfolioEntry = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/portfolio/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to delete portfolio entry (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete portfolio entry");
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
