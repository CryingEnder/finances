"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { translateApiError } from "../translate-api-error";

export function useApiErrorMessage() {
  const tApi = useTranslations("ApiErrors");
  const tValidation = useTranslations("Validation");

  return useCallback(
    (error: unknown, fallback: string) =>
      translateApiError(error, tApi, tValidation, fallback),
    [tApi, tValidation],
  );
}
