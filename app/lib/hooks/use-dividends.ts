import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Dividend } from "../types";

export const dividendsKeys = {
  all: ["dividends"] as const,
  lists: () => [...dividendsKeys.all, "list"] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parseDividend = (value: unknown): Dividend => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid dividend payload");
  }

  const payload = value as Record<string, unknown>;
  const year = payload.year;
  const amount = payload.amount;
  const instrument = payload.instrument;
  const isin = payload.isin;
  const issuer = payload.issuer;
  const notes = payload.notes;
  const id = payload._id;

  if (
    "number" !== typeof year ||
    "number" !== typeof amount ||
    "string" !== typeof instrument ||
    "string" !== typeof isin ||
    "string" !== typeof issuer
  ) {
    throw new Error("Invalid dividend payload");
  }

  if (undefined !== notes && "string" !== typeof notes) {
    throw new Error("Invalid dividend payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid dividend payload");
  }

  return {
    _id: id,
    instrument,
    isin,
    issuer,
    year,
    amount,
    ...(undefined !== notes && notes.length > 0 ? { notes } : {}),
  };
};

const parseDividends = (value: unknown): Dividend[] => {
  if (!Array.isArray(value)) {
    throw new Error("Invalid dividends payload");
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

const fetchDividends = async (): Promise<Dividend[]> => {
  const response = await fetch("/api/dividends");
  if (!response.ok) {
    throw new Error(`Failed to fetch dividends (${String(response.status)})`);
  }

  const data: unknown = await response.json();
  return parseDividends(data);
};

const createDividend = async (
  dividend: Omit<Dividend, "_id">,
): Promise<Dividend> => {
  const response = await fetch("/api/dividends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dividend),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const errorMessage = extractErrorMessage(
      errorData,
      `Failed to create dividend (${String(response.status)})`,
    );
    throw new Error(errorMessage);
  }

  const data: unknown = await response.json();
  return parseDividend(data);
};

const updateDividend = async ({
  _id,
  ...dividend
}: Dividend): Promise<Dividend> => {
  if (!_id) {
    throw new Error("Dividend ID is required");
  }

  const response = await fetch(`/api/dividends/${_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dividend),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const errorMessage = extractErrorMessage(
      errorData,
      `Failed to update dividend (${String(response.status)})`,
    );
    throw new Error(errorMessage);
  }

  const data: unknown = await response.json();
  return parseDividend(data);
};

const deleteDividend = async (id: string): Promise<void> => {
  const response = await fetch(`/api/dividends/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const errorMessage = extractErrorMessage(
      errorData,
      `Failed to delete dividend (${String(response.status)})`,
    );
    throw new Error(errorMessage);
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
