"use client";

import { User } from "lucide-react";
import { cn } from "../../lib/utils";
import Link from "next/link";
import Logo from "../../components/Logo";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Suspense, lazy } from "react";
import LogoutButton from "../../components/LogoutButton";
import { ClientProvider } from "../../lib/providers/client-provider";

const StocksTab = lazy(() => import("./StocksTab"));
const DepositsTab = lazy(() => import("./DepositsTab"));

interface DashboardContentProps {
  userName: string;
}

export default function DashboardContent({ userName }: DashboardContentProps) {
  return (
    <ClientProvider>
      <div
        className={cn(
          "min-h-screen",
          "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900"
        )}
      >
        <header className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-3">
                <Logo withBorder size="md" borderSize="sm" />
                <h1 className="text-xl font-semibold text-white">
                  Finance Manager
                </h1>
              </Link>

              <div className="flex items-center gap-4">
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
              Welcome back, {userName}!
            </h2>
            <p className="text-zinc-400">Manage your financial portfolio</p>
          </div>

          <Tabs defaultValue="stocks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50 border border-zinc-700 h-12 space-x-1">
              <TabsTrigger
                value="stocks"
                className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-zinc-700/50 hover:text-white"
              >
                Stocks
              </TabsTrigger>
              <TabsTrigger
                value="deposits"
                className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-zinc-700/50 hover:text-white"
              >
                Deposits
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-6">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-zinc-400">Loading stocks...</p>
                    </div>
                  </div>
                }
              >
                <StocksTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="deposits" className="mt-6">
              <Suspense
                fallback={
                  <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-zinc-400">Loading deposits...</p>
                    </div>
                  </div>
                }
              >
                <DepositsTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ClientProvider>
  );
}
