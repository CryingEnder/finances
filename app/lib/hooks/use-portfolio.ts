import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioEntry } from "../types";

export const portfolioKeys = {
  all: ["portfolio"] as const,
  lists: () => [...portfolioKeys.all, "list"] as const,
  list: (filters: string) => [...portfolioKeys.lists(), { filters }] as const,
  details: () => [...portfolioKeys.all, "detail"] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
};

const fetchPortfolioEntries = async (): Promise<PortfolioEntry[]> => {
  try {
    const response = await fetch("/api/portfolio");
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio entries (${response.status})`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch portfolio entries");
  }
};

const createPortfolioEntry = async (
  entry: Omit<PortfolioEntry, "_id">
): Promise<PortfolioEntry> => {
  try {
    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to create portfolio entry (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to create portfolio entry");
  }
};

const updatePortfolioEntry = async ({
  _id,
  ...entry
}: PortfolioEntry): Promise<PortfolioEntry> => {
  try {
    const response = await fetch(`/api/portfolio/${_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.details?.[0]?.message ||
        errorData.error ||
        `Failed to update portfolio entry (${response.status})`;
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to update portfolio entry");
  }
};

const deletePortfolioEntry = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/portfolio/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error ||
        `Failed to delete portfolio entry (${response.status})`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to delete portfolio entry");
  }
};

export function usePortfolioEntries() {
  return useQuery({
    queryKey: portfolioKeys.lists(),
    queryFn: fetchPortfolioEntries,
  });
}

export function useCreatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPortfolioEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useUpdatePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePortfolioEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useDeletePortfolioEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePortfolioEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}
