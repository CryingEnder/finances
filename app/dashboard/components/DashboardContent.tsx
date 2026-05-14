"use client";

import Link from "next/link";

import { User } from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslations } from "next-intl";

import Logo from "../../components/Logo";
import LogoutButton from "../../components/LogoutButton";
import LanguageToggle from "../../components/LanguageToggle";

import { cn } from "../../lib/utils";
import { ClientProvider } from "../../lib/providers/client-provider";
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "../../components/ui/tabs";

const StocksTab = lazy(() => import("./StocksTab"));
const DepositsTab = lazy(() => import("./DepositsTab"));
const TransactionsTab = lazy(() => import("./TransactionsTab"));
const DividendsTab = lazy(() => import("./DividendsTab"));
const SummaryTab = lazy(() => import("./SummaryTab"));

const dashboardTabTriggerClass =
  "data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 cursor-pointer flex h-auto min-h-11 w-full min-w-0 items-center justify-center whitespace-normal px-2 py-2 text-center text-sm transition-colors duration-200 hover:bg-zinc-700/50 hover:text-white sm:px-3";

interface DashboardContentProps {
  userName: string;
}

export default function DashboardContent({ userName }: DashboardContentProps) {
  const t = useTranslations("Dashboard");

  return (
    <ClientProvider>
      <div
        className={cn(
          "min-h-screen",
          "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900",
        )}
      >
        <header className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-3">
                <Logo size="md" withBorder borderSize="sm" />
                <h1 className="text-xl font-semibold text-white">
                  {t("appTitle")}
                </h1>
              </Link>

              <div className="flex items-center gap-4">
                <div className="hidden lg:block">
                  <LanguageToggle />
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{userName}</span>
                </div>

                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {t("welcomeBack", { name: userName })}
            </h2>
            <p className="text-zinc-400">{t("managePortfolio")}</p>
            <div className="mt-3 lg:hidden">
              <LanguageToggle />
            </div>
          </div>

          <Tabs defaultValue="stocks" className="flex w-full flex-col gap-0">
            <TabsList className="grid h-auto w-full shrink-0 grid-cols-3 gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-1 min-h-12 lg:grid-cols-5">
              <TabsTrigger value="stocks" className={dashboardTabTriggerClass}>
                {t("tabPortfolio")}
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className={dashboardTabTriggerClass}
              >
                {t("tabTransactions")}
              </TabsTrigger>
              <TabsTrigger
                value="deposits"
                className={dashboardTabTriggerClass}
              >
                {t("tabDeposits")}
              </TabsTrigger>
              <TabsTrigger
                value="dividends"
                className={dashboardTabTriggerClass}
              >
                {t("tabDividends")}
              </TabsTrigger>
              <TabsTrigger value="summary" className={dashboardTabTriggerClass}>
                {t("tabSummary")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-6">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                      <p className="text-zinc-400">{t("loadingStocks")}</p>
                    </div>
                  </div>
                }
              >
                <StocksTab />
              </Suspense>
            </TabsContent>

            <TabsContent className="mt-6" value="transactions">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
                      <p className="text-zinc-400">
                        {t("loadingTransactions")}
                      </p>
                    </div>
                  </div>
                }
              >
                <TransactionsTab />
              </Suspense>
            </TabsContent>

            <TabsContent className="mt-6" value="deposits">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
                      <p className="text-zinc-400">{t("loadingDeposits")}</p>
                    </div>
                  </div>
                }
              >
                <DepositsTab />
              </Suspense>
            </TabsContent>

            <TabsContent className="mt-6" value="dividends">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4" />
                      <p className="text-zinc-400">{t("loadingDividends")}</p>
                    </div>
                  </div>
                }
              >
                <DividendsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4" />
                      <p className="text-zinc-400">{t("loadingSummary")}</p>
                    </div>
                  </div>
                }
              >
                <SummaryTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ClientProvider>
  );
}
