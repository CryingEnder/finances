import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Etf, EtfCurrency } from "../types";

export const etfsKeys = {
  all: ["etfs"] as const,
  lists: () => [...etfsKeys.all, "list"] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parseEtf = (value: unknown): Etf => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid ETF payload");
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
    throw new Error("Invalid ETF payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid ETF payload");
  }

  const resolvedCurrency: EtfCurrency =
    "EUR" === currency || "USD" === currency || "RON" === currency
      ? currency
      : "EUR";

  return {
    _id: id,
    symbol,
    label,
    volume,
    actualPrice,
    openingPrice,
    currency: resolvedCurrency,
    date:
      "string" === typeof date && date.length > 0 ? date : undefined,
  };
};

const parseEtfs = (value: unknown): Etf[] => {
  if (!Array.isArray(value)) {
    throw new Error("Invalid ETFs payload");
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

const fetchEtfs = async (): Promise<Etf[]> => {
  try {
    const response = await fetch("/api/etfs");
    if (!response.ok) {
      throw new Error(`Failed to fetch ETFs (${String(response.status)})`);
    }

    const data: unknown = await response.json();
    return parseEtfs(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch ETFs");
  }
};

const createEtf = async (etf: Omit<Etf, "_id">): Promise<Etf> => {
  try {
    const response = await fetch("/api/etfs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(etf),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to create ETF (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create ETF");
  }
};

const updateEtf = async ({ _id, ...etf }: Etf): Promise<Etf> => {
  try {
    if (!_id) {
      throw new Error("ETF ID is required");
    }

    const response = await fetch(`/api/etfs/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(etf),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to update ETF (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseEtf(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update ETF");
  }
};

const deleteEtf = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/etfs/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to delete ETF (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete ETF");
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
