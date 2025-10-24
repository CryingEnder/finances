import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Company } from "../types";

export const companiesKeys = {
  all: ["companies"] as const,
  lists: () => [...companiesKeys.all, "list"] as const,
  list: (filters: string) => [...companiesKeys.lists(), { filters }] as const,
  details: () => [...companiesKeys.all, "detail"] as const,
  detail: (id: string) => [...companiesKeys.details(), id] as const,
};

const fetchCompanies = async (): Promise<Company[]> => {
  try {
    const response = await fetch("/api/companies");
    if (!response.ok) {
      throw new Error(`Failed to fetch companies (${response.status})`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch companies");
  }
};

const createCompany = async (
  company: Omit<Company, "_id">
): Promise<Company> => {
  try {
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to create company (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
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
    const response = await fetch(`/api/companies/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to update company (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error || `Failed to delete company (${response.status})`;
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
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}
