import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Company } from "../types";

export const companiesKeys = {
  all: ["companies"] as const,
  lists: () => [...companiesKeys.all, "list"] as const,
  list: (filters: string) => [...companiesKeys.lists(), { filters }] as const,
  details: () => [...companiesKeys.all, "detail"] as const,
  detail: (id: string) => [...companiesKeys.details(), id] as const,
};

interface ApiErrorPayload {
  error?: string;
  details?: { message?: string }[];
}

const parseCompany = (value: unknown): Company => {
  if ("object" !== typeof value || null === value) {
    throw new Error("Invalid company payload");
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
    throw new Error("Invalid company payload");
  }

  if (undefined !== id && "string" !== typeof id) {
    throw new Error("Invalid company payload");
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
    throw new Error("Invalid companies payload");
  }

  return value.map((item) => parseCompany(item));
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

const fetchCompanies = async (): Promise<Company[]> => {
  try {
    const response = await fetch("/api/companies");
    if (!response.ok) {
      throw new Error(`Failed to fetch companies (${String(response.status)})`);
    }

    const data: unknown = await response.json();
    return parseCompanies(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch companies");
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
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to create company (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseCompany(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create company");
  }
};

const updateCompany = async ({
  _id,
  ...company
}: Company): Promise<Company> => {
  try {
    if (!_id) {
      throw new Error("Company ID is required");
    }

    const response = await fetch(`/api/companies/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to update company (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();
    return parseCompany(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update company");
  }
};

const deleteCompany = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/companies/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const errorMessage = extractErrorMessage(
        errorData,
        `Failed to delete company (${String(response.status)})`,
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete company");
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
