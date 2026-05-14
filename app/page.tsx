import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import Logo from "./components/Logo";
import LoginForm from "./components/LoginForm";

import { cn } from "./lib/utils";
import { getCurrentUser } from "./lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("Login");

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center p-4",
        "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900",
      )}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" withBorder />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <p className="text-zinc-400">{t("subtitle")}</p>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-8 shadow-2xl">
          <LoginForm />
        </div>

        <div className="text-center mt-6">
          <p className="text-zinc-500 text-sm">{t("tagline")}</p>
        </div>
      </div>
    </div>
  );
}
