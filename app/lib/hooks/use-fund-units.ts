import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { FundUnit } from "../types";

import { resolveCurrency } from "../currency";
import { API_ERROR_CODES } from "../api-error-codes";
import { ApiRequestError } from "../api-request-error";

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

const parseFundUnit = (value: unknown): FundUnit => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const name = payload.name;
  const totalValue = payload.totalValue;
  const profit = payload.profit;
  const bondsPercent = payload.bondsPercent;
  const currency = payload.currency;
  const openedDate = payload.openedDate;
  const date = payload.date;
  const id = payload._id;

  if (
    "string" !== typeof name ||
    "number" !== typeof totalValue ||
    "number" !== typeof profit ||
    "number" !== typeof bondsPercent
  ) {
    throwInvalidPayload();
  }

  if (undefined !== id && "string" !== typeof id) {
    throwInvalidPayload();
  }

  return {
    _id: id,
    name,
    totalValue,
    profit,
    bondsPercent,
    currency: resolveCurrency(currency),
    openedDate:
      "string" === typeof openedDate && openedDate.length > 0
        ? openedDate
        : undefined,
    date: "string" === typeof date && date.length > 0 ? date : undefined,
  };
};

const parseFundUnits = (value: unknown): FundUnit[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.reduce<FundUnit[]>((acc, item) => {
    try {
      acc.push(parseFundUnit(item));
    } catch (error) {
      console.error("Skipping invalid fund unit payload", error);
    }
    return acc;
  }, []);
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

const fundUnitRequestBody = ({
  name,
  openedDate,
  totalValue,
  profit,
  bondsPercent,
  currency,
}: Omit<FundUnit, "_id" | "date">) => ({
  name,
  openedDate,
  totalValue,
  profit,
  bondsPercent,
  currency,
});

const createFundUnit = async (
  fundUnit: Omit<FundUnit, "_id" | "date">,
): Promise<FundUnit> => {
  try {
    const response = await fetch("/api/fund-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fundUnitRequestBody(fundUnit)),
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
  name,
  openedDate,
  totalValue,
  profit,
  bondsPercent,
  currency,
}: FundUnit): Promise<FundUnit> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/fund-units/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        fundUnitRequestBody({
          name,
          openedDate,
          totalValue,
          profit,
          bondsPercent,
          currency,
        }),
      ),
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

export function useFundUnits() {
  return useQuery({
    queryKey: fundUnitsKeys.lists(),
    queryFn: fetchFundUnits,
  });
}

export function useCreateFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFundUnit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fundUnitsKeys.lists() });
    },
  });
}

export function useUpdateFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFundUnit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fundUnitsKeys.lists() });
    },
  });
}

export function useDeleteFundUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFundUnit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fundUnitsKeys.lists() });
    },
  });
}
