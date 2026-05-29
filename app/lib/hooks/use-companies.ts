import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Company } from "../types";

import { API_ERROR_CODES } from "../api-error-codes";
import { ApiRequestError } from "../api-request-error";
import { parseApiErrorPayload } from "../extract-api-error";

import { dividendsKeys } from "./use-dividends";
import { portfolioKeys } from "./use-portfolio";
import { transactionsKeys } from "./use-transactions";
import {
  throwIdRequired,
  throwNetworkError,
  throwInvalidPayload,
} from "./api-fetch";

export const companiesKeys = {
  all: ["companies"] as const,
  lists: () => [...companiesKeys.all, "list"] as const,
  list: (filters: string) => [...companiesKeys.lists(), { filters }] as const,
  details: () => [...companiesKeys.all, "detail"] as const,
  detail: (id: string) => [...companiesKeys.details(), id] as const,
};

const parseCompany = (value: unknown): Company => {
  if ("object" !== typeof value || null === value) {
    throwInvalidPayload();
  }

  const payload = value as Record<string, unknown>;
  const instrument = payload.instrument;
  const isin = payload.isin;
  const issuer = payload.issuer;
  const id = payload._id;

  if (
    "string" !== typeof instrument ||
    "string" !== typeof isin ||
    "string" !== typeof issuer
  ) {
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
  };
};

const parseCompanies = (value: unknown): Company[] => {
  if (!Array.isArray(value)) {
    throwInvalidPayload();
  }

  return value.map((item) => parseCompany(item));
};

const fetchCompanies = async (): Promise<Company[]> => {
  try {
    const response = await fetch("/api/companies");
    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw parseApiErrorPayload(
        errorData,
        API_ERROR_CODES.failedFetchCompanies,
      );
    }

    const data: unknown = await response.json();
    return parseCompanies(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const createCompany = async (
  company: Omit<Company, "_id">,
): Promise<Company> => {
  try {
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw parseApiErrorPayload(
        errorData,
        API_ERROR_CODES.failedCreateCompany,
      );
    }

    const data: unknown = await response.json();
    return parseCompany(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const updateCompany = async ({
  _id,
  ...company
}: Company): Promise<Company> => {
  try {
    if (!_id) {
      throwIdRequired();
    }

    const response = await fetch(`/api/companies/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw parseApiErrorPayload(
        errorData,
        API_ERROR_CODES.failedUpdateCompany,
      );
    }

    const data: unknown = await response.json();
    return parseCompany(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

const deleteCompany = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/companies/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      throw parseApiErrorPayload(
        errorData,
        API_ERROR_CODES.failedDeleteCompany,
      );
    }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throwNetworkError();
  }
};

export function useCompanies() {
  return useQuery({
    queryKey: companiesKeys.lists(),
    queryFn: fetchCompanies,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: dividendsKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: transactionsKeys.lists(),
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}
