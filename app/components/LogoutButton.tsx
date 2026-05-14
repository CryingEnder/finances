"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { cn } from "../lib/utils";
import { logoutAction } from "../actions/auth";

export default function LogoutButton() {
  const t = useTranslations("Logout");
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch {
      // Silence
    }
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleLogout();
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer",
        "text-zinc-400 hover:text-white hover:bg-zinc-700",
      )}
    >
      <LogOut className="w-4 h-4" />
      {t("label")}
    </button>
  );
}
