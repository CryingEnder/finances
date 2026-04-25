"use client";

import { useState } from "react";
import {
  Edit,
  Plus,
  Trash2,
  BarChart3,
  Building2,
  TrendingUp,
} from "lucide-react";

import type {
  Deposit,
  DepositSummary,
  DepositWithCalculations,
} from "../../lib/types";

import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { InfoTooltip } from "../../components/ui/info-tooltip";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  useDeposits,
  useCreateDeposit,
  useDeleteDeposit,
  useUpdateDeposit,
} from "../../lib/hooks/use-deposits";

import DepositsChart from "./DepositsChart";

export default function DepositsTab() {
  const {
    data: deposits = [],
    isLoading: depositsLoading,
    error: _error,
  } = useDeposits();

  const createDepositMutation = useCreateDeposit();
  const updateDepositMutation = useUpdateDeposit();
  const deleteDepositMutation = useDeleteDeposit();

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [depositForm, setDepositForm] = useState({
    bank: "",
    depositName: "",
    principal: "",
    interestRate: "",
    startDate: "",
    maturityDate: "",
    currentBalance: "",
    earnedInterest: "",
    isActive: true,
    autoRenew: false,
  });
  const [depositError, setDepositError] = useState<string>("");

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");

    try {
      const depositData = {
        bank: depositForm.bank,
        depositName: depositForm.depositName,
        principal: parseFloat(depositForm.principal),
        interestRate: parseFloat(depositForm.interestRate),
        startDate: depositForm.startDate,
        maturityDate: depositForm.maturityDate || undefined,
        currentBalance: parseFloat(depositForm.currentBalance),
        earnedInterest: parseFloat(depositForm.earnedInterest),
        isActive: depositForm.isActive,
        autoRenew: depositForm.autoRenew,
      };

      if (editingDeposit) {
        await updateDepositMutation.mutateAsync({
          ...editingDeposit,
          ...depositData,
        });
      } else {
        await createDepositMutation.mutateAsync(depositData);
      }

      resetDepositForm();
      setIsDepositDialogOpen(false);
    } catch (error) {
      setDepositError(
        error instanceof Error ? error.message : "Failed to save deposit",
      );
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deposit?")) {
      return;
    }

    try {
      await deleteDepositMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting deposit:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete deposit",
      );
    }
  };

  const resetDepositForm = () => {
    setDepositForm({
      bank: depositForm.bank,
      depositName: "",
      principal: "",
      interestRate: "",
      startDate: "",
      maturityDate: "",
      currentBalance: "",
      earnedInterest: "",
      isActive: true,
      autoRenew: false,
    });
    setEditingDeposit(null);
    setDepositError("");
  };

  const openEditDeposit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setDepositForm({
      bank: deposit.bank,
      depositName: deposit.depositName,
      principal: deposit.principal.toString(),
      interestRate: deposit.interestRate.toString(),
      startDate: deposit.startDate,
      maturityDate: deposit.maturityDate || "",
      currentBalance: deposit.currentBalance.toString(),
      earnedInterest: deposit.earnedInterest.toString(),
      isActive: deposit.isActive,
      autoRenew: deposit.autoRenew,
    });
    setIsDepositDialogOpen(true);
  };

  const filteredDeposits = deposits.filter((deposit) => {
    if ("all" === selectedFilter) {
      return true;
    }
    if ("active" === selectedFilter) {
      return deposit.isActive;
    }
    if ("matured" === selectedFilter) {
      return !deposit.isActive;
    }
    return true;
  });

  const depositsWithCalculations: DepositWithCalculations[] =
    filteredDeposits.map((deposit) => {
      const startDate = new Date(deposit.startDate);
      const currentDate = new Date();
      const daysActive = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const totalReturn = deposit.currentBalance - deposit.principal;
      const totalReturnPercent =
        deposit.principal > 0 ? (totalReturn / deposit.principal) * 100 : 0;

      let daysToMaturity: number | undefined;
      if (deposit.maturityDate) {
        const maturityDate = new Date(deposit.maturityDate);
        daysToMaturity = Math.floor(
          (maturityDate.getTime() - currentDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }

      return {
        ...deposit,
        daysActive,
        totalReturn,
        totalReturnPercent,
        daysToMaturity,
      };
    });

  const summary: DepositSummary = depositsWithCalculations.reduce(
    (acc, deposit) => ({
      totalPrincipal: acc.totalPrincipal + deposit.principal,
      totalCurrentBalance: acc.totalCurrentBalance + deposit.currentBalance,
      totalEarnedInterest: acc.totalEarnedInterest + deposit.earnedInterest,
      totalReturn: acc.totalReturn + deposit.totalReturn,
      totalReturnPercent: 0,
      activeDeposits: acc.activeDeposits + (deposit.isActive ? 1 : 0),
      maturedDeposits: acc.maturedDeposits + (deposit.isActive ? 0 : 1),
    }),
    {
      totalPrincipal: 0,
      totalCurrentBalance: 0,
      totalEarnedInterest: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      activeDeposits: 0,
      maturedDeposits: 0,
    },
  );

  summary.totalReturnPercent =
    summary.totalPrincipal > 0
      ? (summary.totalReturn / summary.totalPrincipal) * 100
      : 0;

  if (depositsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
            <p className="text-zinc-400">Loading deposits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4 justify-between items-center">
        <Dialog
          open={isDepositDialogOpen}
          onOpenChange={setIsDepositDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              onClick={resetDepositForm}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingDeposit ? "Edit Deposit" : "Add New Deposit"}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                handleDepositSubmit(e).catch(() => {
                  /* errors surfaced via depositError in handler */
                });
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank" className="mb-2 block">
                    Bank
                  </Label>
                  <Input
                    required
                    id="bank"
                    maxLength={100}
                    value={depositForm.bank}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        bank: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="depositName" className="mb-2 block">
                    Deposit Name
                  </Label>
                  <Input
                    required
                    maxLength={200}
                    id="depositName"
                    value={depositForm.depositName}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        depositName: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="principal"
                    className="mb-2 flex items-center gap-2"
                  >
                    Principal Amount
                    <InfoTooltip content="Initial amount deposited" />
                  </Label>
                  <Input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    id="principal"
                    max="10000000"
                    value={depositForm.principal}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        principal: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="interestRate"
                    className="mb-2 flex items-center gap-2"
                  >
                    Interest Rate (%)
                    <InfoTooltip content="Annual interest rate as percentage (e.g., 5.5 for 5.5%)" />
                  </Label>
                  <Input
                    min="0"
                    required
                    max="100"
                    step="0.01"
                    type="number"
                    id="interestRate"
                    value={depositForm.interestRate}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        interestRate: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="mb-2 block">
                    Start Date
                  </Label>
                  <Input
                    required
                    type="date"
                    id="startDate"
                    value={depositForm.startDate}
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="maturityDate">
                    Maturity Date (Optional)
                  </Label>
                  <Input
                    type="date"
                    id="maturityDate"
                    value={depositForm.maturityDate}
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        maturityDate: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="currentBalance"
                    className="mb-2 flex items-center gap-2"
                  >
                    Current Balance
                    <InfoTooltip content="Current amount including all earned interest" />
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    max="10000000"
                    id="currentBalance"
                    value={depositForm.currentBalance}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        currentBalance: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="earnedInterest"
                    className="mb-2 flex items-center gap-2"
                  >
                    Earned Interest
                    <InfoTooltip content="Total interest earned since deposit start" />
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    max="10000000"
                    id="earnedInterest"
                    value={depositForm.earnedInterest}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        earnedInterest: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={depositForm.isActive}
                    className="w-4 h-4 text-green-600 bg-zinc-700 border-zinc-600 rounded focus:ring-green-500"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }));
                    }}
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    Active Deposit
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="autoRenew"
                    type="checkbox"
                    checked={depositForm.autoRenew}
                    className="w-4 h-4 text-green-600 bg-zinc-700 border-zinc-600 rounded focus:ring-green-500"
                    onChange={(e) => {
                      setDepositForm((prev) => ({
                        ...prev,
                        autoRenew: e.target.checked,
                      }));
                    }}
                  />
                  <Label
                    htmlFor="autoRenew"
                    className="text-sm flex items-center gap-2"
                  >
                    Auto Renew
                    <InfoTooltip content="Whether this deposit automatically renews at maturity" />
                  </Label>
                </div>
              </div>

              {depositError && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                  {depositError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  disabled={
                    createDepositMutation.isPending ||
                    updateDepositMutation.isPending
                  }
                >
                  {createDepositMutation.isPending ||
                  updateDepositMutation.isPending
                    ? "Saving..."
                    : editingDeposit
                      ? "Update"
                      : "Add"}{" "}
                  Deposit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setIsDepositDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {deposits.length > 0 && (
          <Button
            variant={showChart ? "default" : "outline"}
            onClick={() => {
              setShowChart(!showChart);
            }}
            className={`cursor-pointer ${
              showChart
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showChart ? "Hide Chart" : "Show Chart"}
          </Button>
        )}
      </div>

      {/* No Data Message */}
      {0 === deposits.length && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <Building2 className="w-16 h-16 mx-auto mb-6 text-zinc-500 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">
              No Deposits Yet
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Start tracking your deposits by adding your first deposit entry.
            </p>
            <p className="text-sm text-zinc-500">
              Use the &quot;Add Deposit&quot; button above to get started.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Summary */}
      {deposits.length > 0 && (
        <>
          {/* Filter */}
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={"all" === selectedFilter ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFilter("all");
                  }}
                  className={`cursor-pointer ${
                    "all" === selectedFilter
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  All ({deposits.length})
                </Button>
                <Button
                  size="sm"
                  variant={"active" === selectedFilter ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFilter("active");
                  }}
                  className={`cursor-pointer ${
                    "active" === selectedFilter
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Active ({summary.activeDeposits})
                </Button>
                <Button
                  size="sm"
                  variant={"matured" === selectedFilter ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFilter("matured");
                  }}
                  className={`cursor-pointer ${
                    "matured" === selectedFilter
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Matured ({summary.maturedDeposits})
                </Button>
              </div>
            </div>
          </div>

          {/* Chart */}
          {showChart && (
            <DepositsChart
              summary={summary}
              deposits={depositsWithCalculations}
            />
          )}

          {/* Summary */}
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Deposit Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-400">Total Principal</p>
                <p className="text-white font-medium">
                  {summary.totalPrincipal.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Total Current Balance</p>
                <p className="text-white font-medium">
                  {summary.totalCurrentBalance.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Total Earned Interest</p>
                <p className="text-green-400 font-medium">
                  {summary.totalEarnedInterest.toLocaleString("ro-RO", {
                    style: "currency",
                    currency: "RON",
                  })}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Total Return %</p>
                <p
                  className={`font-medium ${
                    summary.totalReturnPercent >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {summary.totalReturnPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Deposits Table */}
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Deposits</h3>
            {depositsWithCalculations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-2 text-zinc-300">
                        Bank
                      </th>
                      <th className="text-left py-3 px-2 text-zinc-300">
                        Deposit Name
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Principal
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Interest Rate
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Current Balance
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Earned Interest
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Total Return
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        Return %
                      </th>
                      <th className="text-center py-3 px-2 text-zinc-300">
                        Status
                      </th>
                      <th className="text-center py-3 px-2 text-zinc-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositsWithCalculations.map((deposit) => (
                      <tr
                        key={deposit._id}
                        className="border-b border-zinc-700/50"
                      >
                        <td className="py-3 px-2 text-white font-medium">
                          {deposit.bank}
                        </td>
                        <td className="py-3 px-2 text-zinc-300">
                          {deposit.depositName}
                        </td>
                        <td className="py-3 px-2 text-white text-right">
                          {deposit.principal.toLocaleString("ro-RO", {
                            style: "currency",
                            currency: "RON",
                          })}
                        </td>
                        <td className="py-3 px-2 text-white text-right">
                          {deposit.interestRate.toFixed(2)}%
                        </td>
                        <td className="py-3 px-2 text-white text-right">
                          {deposit.currentBalance.toLocaleString("ro-RO", {
                            style: "currency",
                            currency: "RON",
                          })}
                        </td>
                        <td className="py-3 px-2 text-green-400 text-right">
                          {deposit.earnedInterest.toLocaleString("ro-RO", {
                            style: "currency",
                            currency: "RON",
                          })}
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-medium ${
                            deposit.totalReturn >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {deposit.totalReturn.toLocaleString("ro-RO", {
                            style: "currency",
                            currency: "RON",
                          })}
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-medium ${
                            deposit.totalReturnPercent >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {deposit.totalReturnPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              deposit.isActive
                                ? "bg-green-900/20 text-green-400"
                                : "bg-zinc-700 text-zinc-300"
                            }`}
                          >
                            {deposit.isActive ? "Active" : "Matured"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                              onClick={() => {
                                openEditDeposit(deposit);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deleteDepositMutation.isPending}
                              className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
                              onClick={() => {
                                handleDeleteDeposit(deposit._id!).catch(() => {
                                  /* handled in handleDeleteDeposit */
                                });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-zinc-400 text-center py-8">
                <p>No deposits found for the selected filter.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
