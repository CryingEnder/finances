import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Deposit } from "../types";

import { API_ERROR_CODES } from "../api-error-codes";
import { captureClientError } from "../capture-error";
import { ApiRequestError } from "../api-request-error";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const depositsKeys = {
  all: ["deposits"] as const,
  lists: () => [...depositsKeys.all, "list"] as const,
  list: (filters: string) => [...depositsKeys.lists(), { filters }] as const,
  details: () => [...depositsKeys.all, "detail"] as const,
  detail: (id: string) => [...depositsKeys.details(), id] as const,
};

const parseDeposit = (value: unknown): Deposit => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
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
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
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
    throwInvalidPayload();
  }

  return value.reduce<Deposit[]>((acc, item) => {
    try {
      acc.push(parseDeposit(item));
    } catch (error) {
      captureClientError(error, {
        message: "Invalid deposit payload from API",
      });
    }
    return acc;
  }, []);
};

const fetchDeposits = async (): Promise<Deposit[]> => {
  try {
    const response = await fetch("/api/deposits");
    await assertOkResponse(response, API_ERROR_CODES.failedFetchDeposits);

    const data: unknown = await response.json();
    return parseDeposits(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
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

    await assertOkResponse(response, API_ERROR_CODES.failedCreateDeposit);

    const data: unknown = await response.json();
    return parseDeposit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateDeposit = async ({
  _id,
  ...deposit
}: Deposit): Promise<Deposit> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/deposits/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deposit),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedUpdateDeposit);

    const data: unknown = await response.json();
    return parseDeposit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteDeposit = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/deposits/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(response, API_ERROR_CODES.failedDeleteDeposit);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
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
