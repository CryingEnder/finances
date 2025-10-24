"use client";

import { useRouter } from "next/navigation";
import { logoutAction } from "../actions/auth";
import { LogOut } from "lucide-react";
import { cn } from "../lib/utils";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch (error) {
      // Silence
    }
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer",
        "text-zinc-400 hover:text-white hover:bg-zinc-700"
      )}
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  );
}
