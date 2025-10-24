import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Deposit } from "../types";

export const depositsKeys = {
  all: ["deposits"] as const,
  lists: () => [...depositsKeys.all, "list"] as const,
  list: (filters: string) => [...depositsKeys.lists(), { filters }] as const,
  details: () => [...depositsKeys.all, "detail"] as const,
  detail: (id: string) => [...depositsKeys.details(), id] as const,
};

const fetchDeposits = async (): Promise<Deposit[]> => {
  try {
    const response = await fetch("/api/deposits");
    if (!response.ok) {
      throw new Error(`Failed to fetch deposits (${response.status})`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch deposits");
  }
};

const createDeposit = async (
  deposit: Omit<Deposit, "_id">
): Promise<Deposit> => {
  try {
    const response = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deposit),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to create deposit (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
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
    const response = await fetch(`/api/deposits/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deposit),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to update deposit (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error || `Failed to delete deposit (${response.status})`;
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
      queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}

export function useUpdateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depositsKeys.lists() });
    },
  });
}
