"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

import type { Transaction, TransactionWithCalculations } from "../../lib/types";

import { formatPrice } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { useCompanies } from "../../lib/hooks/use-companies";
import { numberFormatLocale } from "../../lib/number-locale";
import {
  NoticeDialog,
  ConfirmDialog,
} from "../../components/ui/confirm-dialog";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "../../components/ui/select";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "../../lib/hooks/use-transactions";

export default function TransactionsTab() {
  const t = useTranslations("Transactions");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const nf = numberFormatLocale(locale);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: transactions = [], isLoading: transactionsLoading } =
    useTransactions();

  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    transactionDate: "",
    settlementDate: "",
    type: "BUY" as "BUY" | "SELL",
    symbol: "",
    isin: "",
    issuer: "",
    quantity: "",
    unitPrice: "",
    grossAmount: "",
    bcrCommission: "0",
    settlementCommission: "0",
    otherFees: "0",
    externalCosts: "0",
    netAmount: "",
    realizedProfit: "",
    realizedProfitCCY: "",
    taxWithheld: "0",
    market: "",
  });
  const [transactionError, setTransactionError] = useState<string>("");
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(
    null,
  );
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const transactionsWithCalculations: TransactionWithCalculations[] = useMemo(
    () =>
      transactions.map((transaction) => {
        const feesWithoutTax =
          transaction.bcrCommission +
          transaction.settlementCommission +
          transaction.otherFees +
          transaction.externalCosts;
        const totalFees = feesWithoutTax + (transaction.taxWithheld || 0);

        return {
          ...transaction,
          totalFees,
          feesWithoutTax,
        };
      }),
    [transactions],
  );

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionError("");

    try {
      const transactionData = {
        transactionDate: transactionForm.transactionDate,
        settlementDate: transactionForm.settlementDate,
        type: transactionForm.type,
        symbol: transactionForm.symbol,
        isin: transactionForm.isin,
        issuer: transactionForm.issuer,
        quantity: parseFloat(transactionForm.quantity),
        unitPrice: parseFloat(transactionForm.unitPrice),
        grossAmount: parseFloat(transactionForm.grossAmount),
        bcrCommission: parseFloat(transactionForm.bcrCommission),
        settlementCommission: parseFloat(transactionForm.settlementCommission),
        otherFees: parseFloat(transactionForm.otherFees),
        externalCosts: parseFloat(transactionForm.externalCosts),
        netAmount: parseFloat(transactionForm.netAmount),
        realizedProfit:
          "SELL" === transactionForm.type
            ? transactionForm.realizedProfit
              ? parseFloat(transactionForm.realizedProfit)
              : undefined
            : undefined,
        realizedProfitCCY: transactionForm.realizedProfitCCY
          ? parseFloat(transactionForm.realizedProfitCCY)
          : undefined,
        taxWithheld: transactionForm.taxWithheld
          ? parseFloat(transactionForm.taxWithheld)
          : undefined,
        market: transactionForm.market,
        currency: "RON" as const,
      };

      if (editingTransaction) {
        await updateTransactionMutation.mutateAsync({
          ...editingTransaction,
          ...transactionData,
        });
      } else {
        await createTransactionMutation.mutateAsync(transactionData);
      }

      resetTransactionForm();
      setIsTransactionDialogOpen(false);
    } catch (error) {
      setTransactionError(
        error instanceof Error ? error.message : t("failedSave"),
      );
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteTransactionId) {
      return;
    }
    const id = deleteTransactionId;
    try {
      await deleteTransactionMutation.mutateAsync(id);
      setDeleteTransactionId(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      setNoticeMessage(
        error instanceof Error ? error.message : t("failedDelete"),
      );
      setDeleteTransactionId(null);
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      transactionDate: "",
      settlementDate: "",
      type: "BUY",
      symbol: "",
      isin: "",
      issuer: "",
      quantity: "",
      unitPrice: "",
      grossAmount: "",
      bcrCommission: "0",
      settlementCommission: "0",
      otherFees: "0",
      externalCosts: "0",
      netAmount: "",
      realizedProfit: "",
      realizedProfitCCY: "",
      taxWithheld: "0",
      market: "",
    });
    setEditingTransaction(null);
    setTransactionError("");
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      transactionDate: transaction.transactionDate,
      settlementDate: transaction.settlementDate,
      type: transaction.type,
      symbol: transaction.symbol,
      isin: transaction.isin,
      issuer: transaction.issuer,
      quantity: transaction.quantity.toString(),
      unitPrice: transaction.unitPrice.toString(),
      grossAmount: transaction.grossAmount.toString(),
      bcrCommission: transaction.bcrCommission.toString(),
      settlementCommission: transaction.settlementCommission.toString(),
      otherFees: transaction.otherFees.toString(),
      externalCosts: transaction.externalCosts.toString(),
      netAmount: transaction.netAmount.toString(),
      realizedProfit: transaction.realizedProfit?.toString() || "",
      realizedProfitCCY: transaction.realizedProfitCCY?.toString() || "",
      taxWithheld: transaction.taxWithheld?.toString() || "0",
      market: transaction.market,
    });
    setIsTransactionDialogOpen(true);
  };

  const handleCompanySelect = (isin: string) => {
    const company = companies.find((c) => c.isin === isin);
    if (company) {
      setTransactionForm((prev) => ({
        ...prev,
        symbol: company.instrument,
        isin: company.isin,
        issuer: company.issuer,
      }));
    }
  };

  if (companiesLoading || transactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
            <p className="text-zinc-400">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalBuyAmount = transactionsWithCalculations
    .filter((tx) => "BUY" === tx.type)
    .reduce((sum, tx) => sum + tx.netAmount, 0);
  const totalSellAmount = transactionsWithCalculations
    .filter((tx) => "SELL" === tx.type)
    .reduce((sum, tx) => sum + tx.netAmount, 0);
  const totalRealizedProfit = transactionsWithCalculations
    .filter(
      (tx) =>
        "SELL" === tx.type &&
        tx.realizedProfit !== undefined &&
        "number" === typeof tx.realizedProfit,
    )
    .reduce((sum, tx) => sum + (tx.realizedProfit ?? 0), 0);
  const totalFeesWithoutTax = transactionsWithCalculations.reduce(
    (sum, tx) => sum + tx.feesWithoutTax,
    0,
  );
  const totalTax = transactionsWithCalculations.reduce(
    (sum, tx) => sum + (tx.taxWithheld || 0),
    0,
  );
  const totalFees = totalFeesWithoutTax + totalTax;

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Dialog
          open={isTransactionDialogOpen}
          onOpenChange={setIsTransactionDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              onClick={resetTransactionForm}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addTransaction")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction
                  ? t("editTransaction")
                  : t("addNewTransaction")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleTransactionSubmit(e);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type" className="mb-2 block">
                    {t("type")}
                  </Label>
                  <Select
                    value={transactionForm.type}
                    onValueChange={(value: "BUY" | "SELL") => {
                      setTransactionForm((prev) => ({ ...prev, type: value }));
                    }}
                  >
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 border-zinc-600">
                      <SelectItem value="BUY">{t("buy")}</SelectItem>
                      <SelectItem value="SELL">{t("sell")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="company" className="mb-2 block">
                    {t("companyIsin")}
                  </Label>
                  <Select onValueChange={handleCompanySelect}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white cursor-pointer w-full">
                      <SelectValue placeholder={tc("selectCompany")} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 border-zinc-600">
                      {companies.length > 0 ? (
                        companies.map((company) => (
                          <SelectItem
                            key={company._id}
                            value={company.isin}
                            className="cursor-pointer"
                          >
                            {company.instrument} - {company.issuer} (
                            {company.isin})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-zinc-400">
                          {tc("noCompaniesAvailable")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="transactionDate">
                    {t("transactionDate")}
                  </Label>
                  <Input
                    required
                    type="date"
                    id="transactionDate"
                    value={transactionForm.transactionDate}
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        transactionDate: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="settlementDate">
                    {t("settlementDate")}
                  </Label>
                  <Input
                    required
                    type="date"
                    id="settlementDate"
                    value={transactionForm.settlementDate}
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        settlementDate: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col justify-end">
                  <Label htmlFor="symbol" className="mb-2 block">
                    {t("symbol")}
                  </Label>
                  <Input
                    required
                    id="symbol"
                    value={transactionForm.symbol}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        symbol: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Label htmlFor="isin" className="mb-2 block">
                    {tc("isin")}
                  </Label>
                  <Input
                    required
                    id="isin"
                    maxLength={12}
                    value={transactionForm.isin}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        isin: e.target.value.toUpperCase(),
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Label htmlFor="market" className="mb-2 block">
                    {t("marketMic")}
                  </Label>
                  <Input
                    required
                    id="market"
                    value={transactionForm.market}
                    placeholder={t("marketPlaceholder")}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        market: e.target.value.toUpperCase(),
                      }));
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="issuer" className="mb-2 block">
                  {tc("issuer")}
                </Label>
                <Input
                  required
                  id="issuer"
                  value={transactionForm.issuer}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setTransactionForm((prev) => ({
                      ...prev,
                      issuer: e.target.value,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="mb-2 block">
                    {tc("quantity")}
                  </Label>
                  <Input
                    required
                    min="0.0001"
                    id="quantity"
                    step="0.0001"
                    type="number"
                    value={transactionForm.quantity}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice" className="mb-2 block">
                    {t("unitPrice")}
                  </Label>
                  <Input
                    required
                    min="0.0001"
                    step="0.0001"
                    type="number"
                    id="unitPrice"
                    value={transactionForm.unitPrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        unitPrice: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grossAmount" className="mb-2 block">
                    {t("grossAmount")}
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    id="grossAmount"
                    value={transactionForm.grossAmount}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        grossAmount: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="netAmount" className="mb-2 block">
                    {t("netAmount")}
                  </Label>
                  <Input
                    required
                    step="0.01"
                    type="number"
                    id="netAmount"
                    value={transactionForm.netAmount}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        netAmount: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col justify-end">
                  <Label className="mb-2 block" htmlFor="bcrCommission">
                    {t("bcrCommission")}
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    id="bcrCommission"
                    value={transactionForm.bcrCommission}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        bcrCommission: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Label className="mb-2 block" htmlFor="settlementCommission">
                    {t("settlementCommission")}
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    id="settlementCommission"
                    value={transactionForm.settlementCommission}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        settlementCommission: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Label htmlFor="otherFees" className="mb-2 block">
                    {t("otherFees")}
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    id="otherFees"
                    value={transactionForm.otherFees}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        otherFees: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <Label className="mb-2 block" htmlFor="externalCosts">
                    {t("externalCosts")}
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    id="externalCosts"
                    value={transactionForm.externalCosts}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        externalCosts: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {"SELL" === transactionForm.type && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block" htmlFor="realizedProfit">
                      {t("realizedProfitRon")}
                    </Label>
                    <Input
                      required
                      step="0.01"
                      type="number"
                      id="realizedProfit"
                      value={transactionForm.realizedProfit}
                      className="bg-zinc-700 border-zinc-600 text-white"
                      onChange={(e) => {
                        setTransactionForm((prev) => ({
                          ...prev,
                          realizedProfit: e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block" htmlFor="realizedProfitCCY">
                      {t("realizedProfitCcy")}
                    </Label>
                    <Input
                      step="0.01"
                      type="number"
                      id="realizedProfitCCY"
                      value={transactionForm.realizedProfitCCY}
                      className="bg-zinc-700 border-zinc-600 text-white"
                      onChange={(e) => {
                        setTransactionForm((prev) => ({
                          ...prev,
                          realizedProfitCCY: e.target.value,
                        }));
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="taxWithheld" className="mb-2 block">
                  {t("taxWithheld")}
                  <span className="text-xs text-zinc-400 block mt-1">
                    {t("taxWithheldHint")}
                  </span>
                </Label>
                <Input
                  min="0"
                  step="0.01"
                  type="number"
                  id="taxWithheld"
                  placeholder="0.00"
                  value={transactionForm.taxWithheld}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setTransactionForm((prev) => ({
                      ...prev,
                      taxWithheld: e.target.value,
                    }));
                  }}
                />
              </div>

              {transactionError && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                  {transactionError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  disabled={
                    createTransactionMutation.isPending ||
                    updateTransactionMutation.isPending
                  }
                >
                  {createTransactionMutation.isPending ||
                  updateTransactionMutation.isPending
                    ? t("saving")
                    : editingTransaction
                      ? t("saveUpdate")
                      : t("saveAdd")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setIsTransactionDialogOpen(false);
                  }}
                >
                  {tc("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {transactionsWithCalculations.length > 0 && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t("summary")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">{t("totalBuyAmount")}</p>
              <p className="text-white font-medium">
                {totalBuyAmount.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">{t("totalSellAmount")}</p>
              <p className="text-white font-medium">
                {totalSellAmount.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">{t("totalRealizedProfit")}</p>
              <p
                className={`font-medium ${
                  totalRealizedProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {totalRealizedProfit.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">{t("totalFeesExclTax")}</p>
              <p className="text-white font-medium">
                {totalFeesWithoutTax.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">{t("totalTaxWithheld")}</p>
              <p className="text-white font-medium">
                {totalTax.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 font-medium">{t("totalCosts")}</p>
              <p className="text-white font-semibold text-lg">
                {totalFees.toLocaleString(nf, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {transactionsWithCalculations.length > 0 ? (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t("allTransactions")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-2 text-zinc-300">
                    {t("settlementDate")}
                  </th>
                  <th className="text-left py-3 px-2 text-zinc-300">
                    {t("type")}
                  </th>
                  <th className="text-left py-3 px-2 text-zinc-300">
                    {t("symbol")}
                  </th>
                  <th className="text-left py-3 px-2 text-zinc-300">
                    {tc("isin")}
                  </th>
                  <th className="text-left py-3 px-2 text-zinc-300">
                    {tc("issuer")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("qty")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("unitPrice")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("grossAmount")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("netAmount")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("fees")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {t("tax")}
                  </th>
                  <th className="text-right py-3 px-2 text-zinc-300">
                    {tc("profit")}
                  </th>
                  <th className="text-center py-3 px-2 text-zinc-300">
                    {tc("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithCalculations.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="border-b border-zinc-700/50"
                  >
                    <td className="py-3 px-2 text-white">
                      {new Date(
                        transaction.settlementDate,
                      ).toLocaleDateString(nf)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          "BUY" === transaction.type
                            ? "bg-green-900/30 text-green-400 border border-green-800"
                            : "bg-red-900/30 text-red-400 border border-red-800"
                        }`}
                      >
                        {"BUY" === transaction.type ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {"BUY" === transaction.type ? t("buy") : t("sell")}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-white font-medium">
                      {transaction.symbol}
                    </td>
                    <td className="py-3 px-2 text-zinc-300">
                      {transaction.isin}
                    </td>
                    <td className="py-3 px-2 text-zinc-300">
                      {transaction.issuer}
                    </td>
                    <td className="py-3 px-2 text-white text-right">
                      {transaction.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-white text-right">
                      {formatPrice(transaction.unitPrice)}
                    </td>
                    <td className="py-3 px-2 text-white text-right">
                      {transaction.grossAmount.toLocaleString(nf, {
                        style: "currency",
                        currency: "RON",
                      })}
                    </td>
                    <td className="py-3 px-2 text-white text-right">
                      {transaction.netAmount.toLocaleString(nf, {
                        style: "currency",
                        currency: "RON",
                      })}
                    </td>
                    <td className="py-3 px-2 text-zinc-300 text-right">
                      {transaction.feesWithoutTax.toLocaleString(nf, {
                        style: "currency",
                        currency: "RON",
                      })}
                    </td>
                    <td className="py-3 px-2 text-zinc-300 text-right">
                      {(transaction.taxWithheld || 0).toLocaleString(nf, {
                        style: "currency",
                        currency: "RON",
                      })}
                    </td>
                    <td
                      className={`py-3 px-2 text-right font-medium ${
                        transaction.realizedProfit !== undefined &&
                        "number" === typeof transaction.realizedProfit
                          ? transaction.realizedProfit >= 0
                            ? "text-green-400"
                            : "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {transaction.realizedProfit !== undefined &&
                      "number" === typeof transaction.realizedProfit
                        ? transaction.realizedProfit.toLocaleString(nf, {
                            style: "currency",
                            currency: "RON",
                          })
                        : tc("emDash")}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                          onClick={() => {
                            openEditTransaction(transaction);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteTransactionMutation.isPending}
                          className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
                          onClick={() => {
                            setDeleteTransactionId(transaction._id!);
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
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-6 text-zinc-500 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">
              {t("emptyTitle")}
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">{t("emptyBody")}</p>
            <p className="text-sm text-zinc-500">{t("emptyHint")}</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        title={t("deleteTitle")}
        open={deleteTransactionId !== null}
        description={t("deleteDescription")}
        onConfirm={confirmDeleteTransaction}
        isConfirming={deleteTransactionMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTransactionId(null);
        }}
      />
      <NoticeDialog
        message={noticeMessage ?? ""}
        open={noticeMessage !== null}
        onOpenChange={(open) => {
          if (!open) setNoticeMessage(null);
        }}
      />
    </div>
  );
}
