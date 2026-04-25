import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Deposit } from "../types";

export const depositsKeys = {
  all: ["deposits"] as const,
  lists: () => [...depositsKeys.all, "list"] as const,
  list: (filters: string) => [...depositsKeys.lists(), { filters }] as const,
  details: () => [...depositsKeys.all, "detail"] as const,
  detail: (id: string) => [...depositsKeys.details(), id] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parseDeposit = (value: unknown): Deposit => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid deposit payload");
  }

  const payload = value as Record<string, unknown>;
  const bank = payload.bank;
  const depositName = payload.depositName;
  const termMonths = payload.termMonths;
  const principal = payload.principal;
  const interestRate = payload.interestRate;
  const startDate = payload.startDate;
  const maturityDate = payload.maturityDate;
  const currentBalance = payload.currentBalance;
  const earnedInterest = payload.earnedInterest;
  const isActive = payload.isActive;
  const autoRenew = payload.autoRenew;
  const id = payload._id;

  if (
    "string" !== typeof bank ||
    "string" !== typeof depositName ||
    "number" !== typeof termMonths ||
    "number" !== typeof principal ||
    "number" !== typeof interestRate ||
    "string" !== typeof startDate ||
    ("string" !== typeof maturityDate &&
      undefined !== maturityDate &&
      null !== maturityDate) ||
    "number" !== typeof currentBalance ||
    "number" !== typeof earnedInterest ||
    "boolean" !== typeof isActive ||
    "boolean" !== typeof autoRenew
  ) {
    throw new Error("Invalid deposit payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid deposit payload");
  }

  return {
    _id: id,
    bank,
    depositName,
    termMonths,
    principal,
    interestRate,
    startDate,
    maturityDate:
      "string" === typeof maturityDate && maturityDate.length > 0
        ? maturityDate
        : undefined,
    currentBalance,
    earnedInterest,
    isActive,
    autoRenew,
  };
};

const parseDeposits = (value: unknown): Deposit[] => {
  if (!Array.isArray(value)) {
    throw new Error("Invalid deposits payload");
  }

  return value.reduce<Deposit[]>((acc, item) => {
    try {
      acc.push(parseDeposit(item));
    } catch (error) {
      // Keep legacy rows from blanking the whole tab.
      console.warn("Skipping invalid deposit payload", error);
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

const fetchDeposits = async (): Promise<Deposit[]> => {
  try {
    const response = await fetch("/api/deposits");
    if (!response.ok) {
      throw new Error(`Failed to fetch deposits (${String(response.status)})`);
    }

    const data: unknown = await response.json();
    return parseDeposits(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch deposits");
  }
};

const createDeposit = async (
  deposit: Omit<Deposit, "_id">,
): Promise<Deposit> => {
  try {
    const response = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deposit),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to create deposit (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseDeposit(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create deposit");
  }
};

const updateDeposit = async ({
  _id,
  ...deposit
}: Deposit): Promise<Deposit> => {
  try {
    if (!_id) {
      throw new Error("Deposit ID is required");
    }

    const response = await fetch(`/api/deposits/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deposit),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to update deposit (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseDeposit(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update deposit");
  }
};

const deleteDeposit = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/deposits/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to delete deposit (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete deposit");
  }
};

export function useDeposits() {
  return useQuery({
    queryKey: depositsKeys.lists(),
    queryFn: fetchDeposits,
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeposit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}

export function useUpdateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDeposit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeposit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}
