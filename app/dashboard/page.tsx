import { requireAuth } from "../lib/auth";
import { User, DollarSign } from "lucide-react";
import { cn } from "../lib/utils";
import Link from "next/link";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import StocksTab from "./components/StocksTab";
import DepositsTab from "./components/DepositsTab";
import LogoutButton from "../components/LogoutButton";

export default async function Dashboard() {
  const user = await requireAuth();

  return (
    <div
      className={cn(
        "min-h-screen",
        "bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900"
      )}
    >
      {/* Header */}
      <header className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Finance Manager
              </h1>
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-300">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.name}</span>
              </div>

              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-zinc-400">Manage your financial portfolio</p>
        </div>

        {/* Tabs */}
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
            <StocksTab />
          </TabsContent>

          <TabsContent value="deposits" className="mt-6">
            <DepositsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
