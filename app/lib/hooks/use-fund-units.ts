import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { FundUnit, TradeType, FundUnitStatus } from "../types";

import { resolveCurrency } from "../currency";
import { resolveTradeType } from "../validation";
import { API_ERROR_CODES } from "../api-error-codes";
import { captureClientError } from "../capture-error";
import { ApiRequestError } from "../api-request-error";
import {
  appendFundUnitToList,
  replaceFundUnitInList,
  removeFundUnitFromList,
} from "../fund-unit-cache";

import {
  throwIdRequired,
  assertOkResponse,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const fundUnitsKeys = {
  all: ["fundUnits"] as const,
  lists: () => [...fundUnitsKeys.all, "list"] as const,
};

const parseFundUnitStatus = (value: unknown): FundUnitStatus => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const type = payload.type;
  const totalValue = payload.totalValue;
  const profit = payload.profit;
  const createdAt = payload.createdAt;
  const date = payload.date;
  const id = payload._id;

  if ("number" !== typeof totalValue || "number" !== typeof profit) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  if ("string" !== typeof date || 0 === date.length) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    type: resolveTradeType(type),
    totalValue,
    profit,
    date,
    createdAt:
      "string" === typeof createdAt && createdAt.length > 0
        ? createdAt
        : undefined,
  };

};

const parseFundUnitStatuses = (value: unknown): FundUnitStatus[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.flatMap((item) => {
    try {
      return [parseFundUnitStatus(item)];
    } catch (error) {
      captureClientError(error, {
        message: "Invalid fund unit status payload from API",
      });
      return [];
    }
  });
};

const parseFundUnit = (value: unknown): FundUnit => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const name = payload.name;
  const bondsPercent = payload.bondsPercent;
  const currency = payload.currency;
  const openedDate = payload.openedDate;
  const date = payload.date;
  const statuses = payload.statuses;
  const id = payload._id;

  if ("string" !== typeof name || "number" !== typeof bondsPercent) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    name,
    bondsPercent,
    currency: resolveCurrency(currency),
    openedDate:
      "string" === typeof openedDate && openedDate.length > 0
        ? openedDate
        : undefined,
    date: "string" === typeof date && date.length > 0 ? date : undefined,
    statuses: parseFundUnitStatuses(
      Array.isArray(statuses) ? statuses : [],
    ),
  };
};

const parseFundUnits = (value: unknown): FundUnit[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.flatMap((item) => {
    try {
      return [parseFundUnit(item)];
    } catch (error) {
      captureClientError(error, {
        message: "Invalid fund unit payload from API",
      });
      return [];
    }
  });
};

const fetchFundUnits = async (): Promise<FundUnit[]> => {
  try {
    const response = await fetch("/api/fund-units");
    await assertOkResponse(response, API_ERROR_CODES.failedFetchFundUnits);

    const data: unknown = await response.json();
    return parseFundUnits(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export type CreateFundUnitInput = Pick<
  FundUnit,
  "name" | "openedDate" | "bondsPercent" | "currency"
>;

export type UpdateFundUnitInput = Pick<
  FundUnit,
  "_id" | "openedDate" | "bondsPercent" | "currency"
>;

export interface CreateFundUnitStatusInput {
  fundUnitId: string;
  name: string;
  type: TradeType;
  date: string;
  totalValue: number;
  profit: number;
}

export interface UpdateFundUnitStatusInput {
  fundUnitId: string;
  statusId: string;
  type: TradeType;
  date: string;
  totalValue: number;
  profit: number;
}

export interface DeleteFundUnitStatusInput {
  fundUnitId: string;
  statusId: string;
}

const createFundUnit = async (
  fundUnit: CreateFundUnitInput,
): Promise<FundUnit> => {
  try {
    const response = await fetch("/api/fund-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fundUnit),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedCreateFundUnit);

    const data: unknown = await response.json();
    return parseFundUnit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateFundUnit = async ({
  _id,
  openedDate,
  bondsPercent,
  currency,
}: UpdateFundUnitInput): Promise<FundUnit> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/fund-units/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openedDate, bondsPercent, currency }),
    });

    await assertOkResponse(response, API_ERROR_CODES.failedUpdateFundUnit);

    const data: unknown = await response.json();
    return parseFundUnit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteFundUnit = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/fund-units/${id}`, {
      method: "DELETE",
    });

    await assertOkResponse(response, API_ERROR_CODES.failedDeleteFundUnit);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createFundUnitStatus = async ({
  fundUnitId,
  name,
  type,
  date,
  totalValue,
  profit,
}: CreateFundUnitStatusInput): Promise<FundUnit> => {
  try {
    const response = await fetch(`/api/fund-units/${fundUnitId}/statuses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, date, totalValue, profit }),
    });

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedCreateFundUnitStatus,
    );

    const data: unknown = await response.json();
    return parseFundUnit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateFundUnitStatus = async ({
  fundUnitId,
  statusId,
  type,
  date,
  totalValue,
  profit,
}: UpdateFundUnitStatusInput): Promise<FundUnit> => {
  try {
    const response = await fetch(
      `/api/fund-units/${fundUnitId}/statuses/${statusId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date, totalValue, profit }),
      },
    );

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedUpdateFundUnitStatus,
    );

    const data: unknown = await response.json();
    return parseFundUnit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteFundUnitStatus = async ({
  fundUnitId,
  statusId,
}: DeleteFundUnitStatusInput): Promise<FundUnit> => {
  try {
    const response = await fetch(
      `/api/fund-units/${fundUnitId}/statuses/${statusId}`,
      {
        method: "DELETE",
      },
    );

    await assertOkResponse(
      response,
      API_ERROR_CODES.failedDeleteFundUnitStatus,
    );

    const data: unknown = await response.json();
    return parseFundUnit(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function useFundUnits() {
  return useQuery({
    queryKey: fundUnitsKeys.lists(),
    queryFn: fetchFundUnits,
  });
}

const updateFundUnitsListCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: FundUnit[]) => FundUnit[],
) => {
  queryClient.setQueryData<FundUnit[]>(fundUnitsKeys.lists(), (current) => {
    if (!current) {
      return current;
    }
    return updater(current);
  });
};

export function useCreateFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFundUnit,
    onSuccess: (created) => {
      updateFundUnitsListCache(queryClient, (current) =>
        appendFundUnitToList(current, created),
      );
    },
  });
}

export function useUpdateFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFundUnit,
    onSuccess: (updated) => {
      updateFundUnitsListCache(queryClient, (current) =>
        replaceFundUnitInList(current, updated),
      );
    },
  });
}

export function useDeleteFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFundUnit,
    onSuccess: (_data, id) => {
      updateFundUnitsListCache(queryClient, (current) =>
        removeFundUnitFromList(current, id),
      );
    },
  });
}

export function useCreateFundUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFundUnitStatus,
    onSuccess: (updated) => {
      updateFundUnitsListCache(queryClient, (current) =>
        replaceFundUnitInList(current, updated),
      );
    },
  });
}

export function useUpdateFundUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFundUnitStatus,
    onSuccess: (updated) => {
      updateFundUnitsListCache(queryClient, (current) =>
        replaceFundUnitInList(current, updated),
      );
    },
  });
}

export function useDeleteFundUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFundUnitStatus,
    onSuccess: (updated) => {
      updateFundUnitsListCache(queryClient, (current) =>
        replaceFundUnitInList(current, updated),
      );
    },
  });
}
