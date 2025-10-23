import { requireAuth } from "../lib/auth";
import { logoutAction } from "../actions/auth";
import { LogOut, User, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { cn } from "../lib/utils";

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Finance Manager
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-300">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.name}</span>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                    "text-zinc-400 hover:text-white hover:bg-zinc-700"
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-zinc-400">Here's your financial overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Balance</p>
                <p className="text-2xl font-bold text-white">$12,345.67</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Monthly Income</p>
                <p className="text-2xl font-bold text-white">$5,200.00</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Monthly Expenses</p>
                <p className="text-2xl font-bold text-white">$3,850.00</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-400 rotate-180" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Credit Score</p>
                <p className="text-2xl font-bold text-white">785</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {[
              {
                description: "Grocery Store",
                amount: "-$127.50",
                date: "Today",
                type: "expense",
              },
              {
                description: "Salary Deposit",
                amount: "+$2,600.00",
                date: "Yesterday",
                type: "income",
              },
              {
                description: "Gas Station",
                amount: "-$45.20",
                date: "2 days ago",
                type: "expense",
              },
              {
                description: "Freelance Work",
                amount: "+$850.00",
                date: "3 days ago",
                type: "income",
              },
            ].map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-zinc-700 last:border-b-0"
              >
                <div>
                  <p className="text-white font-medium">
                    {transaction.description}
                  </p>
                  <p className="text-zinc-400 text-sm">{transaction.date}</p>
                </div>
                <p
                  className={cn(
                    "font-semibold",
                    transaction.type === "income"
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {transaction.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
