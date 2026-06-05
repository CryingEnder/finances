"use client";

import { useMemo, Fragment, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2, LineChart, ChevronDown, ChevronRight } from "lucide-react";

import type {
  Etf,
  Currency,
  TradeType,
  EtfTransaction,
  EtfTransactionWithCalculations,
} from "../../lib/types";

import { formatPrice } from "../../lib/utils";
import { CURRENCIES } from "../../lib/currency";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { formatDisplayDate } from "../../lib/dates";
import { TAB_BUTTON_CLASS } from "../../lib/tab-colors";
import { numberFormatLocale } from "../../lib/number-locale";
import { InfoTooltip } from "../../components/ui/info-tooltip";
import { useApiErrorMessage } from "../../lib/hooks/use-api-error-message";
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
  summarizeEtfPosition,
  transactionDisplayDate,
  sortEtfTransactionsByNewest,
  calculateEtfTransactionMetrics,
} from "../../lib/etf-utils";
import {
  useEtfs,
  useCreateEtf,
  useDeleteEtf,
  useUpdateEtf,
  useCreateEtfTransaction,
  useDeleteEtfTransaction,
  useUpdateEtfTransaction,
} from "../../lib/hooks/use-etfs";

import {
  PositionProfitCell,
  PositionProfitColumnHeader,
} from "./position-profit-cell";

function withTransactionCalculations(
  transaction: EtfTransaction,
): EtfTransactionWithCalculations {
  const { value, purchaseCost, profitNet, profitNetPercent } =
    calculateEtfTransactionMetrics(transaction);

  return {
    ...transaction,
    value,
    purchaseCost,
    profitNet,
    profitNetPercent,
  };
}

function currencyLabel(
  currency: Currency,
  t: ReturnType<typeof useTranslations<"Etfs">>,
): string {
  if ("EUR" === currency) {
    return t("currencyEUR");
  }
  if ("USD" === currency) {
    return t("currencyUSD");
  }
  return t("currencyRON");
}

interface EtfFormState {
  symbol: string;
  label: string;
  currency: Currency;
}

interface TransactionFormState {
  type: TradeType;
  volume: string;
  actualPrice: string;
  openingPrice: string;
}

const EMPTY_ETF_FORM: EtfFormState = {
  symbol: "",
  label: "",
  currency: "EUR",
};

const EMPTY_TRANSACTION_FORM: TransactionFormState = {
  type: "BUY",
  volume: "",
  actualPrice: "",
  openingPrice: "",
};

export default function EtfsTab() {
  const t = useTranslations("Etfs");
  const tc = useTranslations("Common");
  const formatError = useApiErrorMessage();
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const profitLabels = useMemo(
    () => ({
      columnTitle: tc("profit"),
      tooltip: t("positionProfitTooltip"),
      unrealized: t("unrealizedProfit"),
      unrealizedPercent: t("unrealizedProfitPercent"),
      realized: t("realizedProfit"),
      realizedPercent: t("realizedProfitPercent"),
    }),
    [t, tc],
  );

  const { data: etfs = [], isLoading } = useEtfs();
  const createMutation = useCreateEtf();
  const updateMutation = useUpdateEtf();
  const deleteMutation = useDeleteEtf();
  const createTransactionMutation = useCreateEtfTransaction();
  const updateTransactionMutation = useUpdateEtfTransaction();
  const deleteTransactionMutation = useDeleteEtfTransaction();

  const [etfDialogOpen, setEtfDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingEtf, setEditingEtf] = useState<Etf | null>(null);
  const [transactionEtf, setTransactionEtf] = useState<Etf | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<EtfTransaction | null>(null);
  const [etfForm, setEtfForm] = useState<EtfFormState>(EMPTY_ETF_FORM);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    EMPTY_TRANSACTION_FORM,
  );
  const [etfFormError, setEtfFormError] = useState("");
  const [transactionFormError, setTransactionFormError] = useState("");
  const [expandedEtfIds, setExpandedEtfIds] = useState<Record<string, boolean>>(
    {},
  );
  const [deleteEtfId, setDeleteEtfId] = useState<string | null>(null);
  const [deleteTransactionTarget, setDeleteTransactionTarget] = useState<{
    etfId: string;
    transactionId: string;
  } | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const byCurrency = useMemo(() => {
    const grouped: Record<Currency, Etf[]> = {
      EUR: [],
      USD: [],
      RON: [],
    };
    for (const etf of etfs) {
      grouped[etf.currency].push(etf);
    }
    return grouped;
  }, [etfs]);

  const resetEtfForm = () => {
    setEtfForm(EMPTY_ETF_FORM);
    setEditingEtf(null);
    setEtfFormError("");
  };

  const resetTransactionForm = () => {
    setTransactionForm(EMPTY_TRANSACTION_FORM);
    setTransactionEtf(null);
    setEditingTransaction(null);
    setTransactionFormError("");
  };

  const beginAddEtf = () => {
    resetEtfForm();
  };

  const openEditEtf = (etf: Etf) => {
    setEditingEtf(etf);
    setEtfForm({
      symbol: etf.symbol,
      label: etf.label,
      currency: etf.currency,
    });
    setEtfFormError("");
    setEtfDialogOpen(true);
  };

  const openAddTransaction = (etf: Etf) => {
    setTransactionEtf(etf);
    setEditingTransaction(null);
    setTransactionForm(EMPTY_TRANSACTION_FORM);
    setTransactionFormError("");
    setTransactionDialogOpen(true);
  };

  const openEditTransaction = (etf: Etf, transaction: EtfTransaction) => {
    setTransactionEtf(etf);
    setEditingTransaction(transaction);
    setTransactionForm({
      type: transaction.type,
      volume: String(transaction.volume),
      actualPrice: String(transaction.actualPrice),
      openingPrice: String(transaction.openingPrice),
    });
    setTransactionFormError("");
    setTransactionDialogOpen(true);
  };

  const toggleExpanded = (etfId: string) => {
    setExpandedEtfIds((prev) => ({
      ...prev,
      [etfId]: !prev[etfId],
    }));
  };

  const handleEtfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtfFormError("");

    if (!etfForm.symbol.trim() || !etfForm.label.trim()) {
      setEtfFormError(t("errRequired"));
      return;
    }

    try {
      if (editingEtf) {
        await updateMutation.mutateAsync({
          _id: editingEtf._id,
          label: etfForm.label.trim(),
          currency: etfForm.currency,
        });
      } else {
        await createMutation.mutateAsync({
          symbol: etfForm.symbol.trim(),
          label: etfForm.label.trim(),
          currency: etfForm.currency,
        });
      }

      resetEtfForm();
      setEtfDialogOpen(false);
    } catch (err) {
      setEtfFormError(formatError(err, t("failedSave")));
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionFormError("");

    if (!transactionEtf?._id) {
      return;
    }

    const volume = parseFloat(transactionForm.volume);
    const actualPrice = parseFloat(transactionForm.actualPrice);
    const openingPrice = parseFloat(transactionForm.openingPrice);

    if (
      Number.isNaN(volume) ||
      Number.isNaN(actualPrice) ||
      Number.isNaN(openingPrice)
    ) {
      setTransactionFormError(t("errRequired"));
      return;
    }

    try {
      if (editingTransaction?._id) {
        await updateTransactionMutation.mutateAsync({
          etfId: transactionEtf._id,
          transactionId: editingTransaction._id,
          type: transactionForm.type,
          volume,
          actualPrice,
          openingPrice,
        });
      } else {
        await createTransactionMutation.mutateAsync({
          etfId: transactionEtf._id,
          symbol: transactionEtf.symbol,
          label: transactionEtf.label,
          type: transactionForm.type,
          volume,
          actualPrice,
          openingPrice,
        });
      }

      resetTransactionForm();
      setTransactionDialogOpen(false);
      setExpandedEtfIds((prev) => ({
        ...prev,
        [transactionEtf._id!]: true,
      }));
    } catch (err) {
      setTransactionFormError(formatError(err, t("failedSaveTransaction")));
    }
  };

  const confirmDeleteEtf = async () => {
    if (!deleteEtfId) {
      return;
    }
    const id = deleteEtfId;
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteEtfId(null);
      setExpandedEtfIds((prev) => {
        const { [id]: _removed, ...next } = prev;
        return next;
      });
    } catch (err) {
      setNoticeMessage(formatError(err, t("failedDelete")));
      setDeleteEtfId(null);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteTransactionTarget) {
      return;
    }
    const target = deleteTransactionTarget;
    try {
      await deleteTransactionMutation.mutateAsync(target);
      setDeleteTransactionTarget(null);
    } catch (err) {
      setNoticeMessage(formatError(err, t("failedDeleteTransaction")));
      setDeleteTransactionTarget(null);
    }
  };

  const renderTransactionTypeBadge = (type: TradeType) => (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        "BUY" === type
          ? "bg-green-900/30 text-green-400 border border-green-800"
          : "bg-red-900/30 text-red-400 border border-red-800"
      }`}
    >
      {"BUY" === type ? t("buy") : t("sell")}
    </span>
  );

  const renderColumnHeader = (label: string, tooltip: string) => (
    <span className="inline-flex items-center justify-start gap-1">
      {label}
      <InfoTooltip content={tooltip} placement="bottom" />
    </span>
  );

  const renderAmount = (value: number) =>
    value.toLocaleString(numberFormat, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const renderTransactions = (etf: Etf) => {
    const statuses = sortEtfTransactionsByNewest(etf.statuses).map(
      withTransactionCalculations,
    );

    if (0 === statuses.length) {
      return (
        <tr>
          <td colSpan={11} className="py-4 px-6 text-sm text-zinc-400 italic">
            {t("noTransactionsYet")}
          </td>
        </tr>
      );
    }

    return statuses.map((transaction) => (
      <tr
        key={transaction._id}
        className="border-b border-zinc-700/30 bg-zinc-900/30"
      >
        <td className="py-2.5 px-6 pl-12">
          {renderTransactionTypeBadge(transaction.type)}
        </td>
        <td className="py-2.5 px-2 text-zinc-300">
          {formatDisplayDate(transactionDisplayDate(transaction.createdAt))}
        </td>
        <td className="py-2.5 px-2 text-white text-right font-medium">
          {transaction.volume.toLocaleString(numberFormat, {
            maximumFractionDigits: 4,
          })}
        </td>
        <td className="py-2.5 px-2 text-white text-right font-medium">
          {formatPrice(transaction.actualPrice)}
        </td>
        <td className="py-2.5 px-2 text-white text-right font-medium">
          {formatPrice(transaction.openingPrice)}
        </td>
        <td className="py-2.5 px-2 text-white text-right font-medium">
          {transaction.value.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
        <td
          className={`py-2.5 px-2 text-right font-semibold ${
            transaction.profitNet >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {transaction.profitNet.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
        <td
          className={`py-2.5 px-2 text-right font-semibold ${
            transaction.profitNetPercent >= 0
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {transaction.profitNetPercent.toFixed(2)}%
        </td>
        <td className="py-2.5 px-2 text-center">
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              onClick={() => {
                openEditTransaction(etf, transaction);
              }}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={deleteTransactionMutation.isPending}
              className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-zinc-700 hover:text-red-300 cursor-pointer"
              onClick={() => {
                if (etf._id && transaction._id) {
                  setDeleteTransactionTarget({
                    etfId: etf._id,
                    transactionId: transaction._id,
                  });
                }
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>
    ));
  };

  const renderEtfTable = (rows: Etf[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="w-10 py-3 pl-2 pr-0" />
            <th className="py-3 pl-1 pr-6 text-left text-zinc-300 whitespace-nowrap">
              {t("position")}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {t("transactionsCount")}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {renderColumnHeader(t("buyValue"), t("buyValueTooltip"))}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {renderColumnHeader(t("totalSellValue"), t("totalSellValueTooltip"))}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              <PositionProfitColumnHeader labels={profitLabels} />
            </th>
            <th className="w-full py-3 px-0" />
            <th className="py-3 pl-2 pr-2 text-right text-zinc-300 whitespace-nowrap">
              {tc("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((etf) => {
            const isExpanded = Boolean(etf._id && expandedEtfIds[etf._id]);
            const positionSummary = summarizeEtfPosition(etf);
            const toggleRow = () => {
              if (etf._id) {
                toggleExpanded(etf._id);
              }
            };
            const handleRowPointerDown = (
              e: React.PointerEvent<HTMLTableRowElement>,
            ) => {
              if (0 !== e.button) {
                return;
              }
              if ((e.target as HTMLElement).closest("[data-etf-row-action]")) {
                return;
              }
              toggleRow();
            };

            return (
              <Fragment key={etf._id}>
                <tr
                  onPointerDown={handleRowPointerDown}
                  className="border-b border-zinc-700/50 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                >
                  <td className="py-3 pl-2 pr-0 align-middle">
                    <span className="inline-flex p-1 text-zinc-400">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </td>
                  <td className="py-3 pl-1 pr-6 align-middle whitespace-nowrap">
                    <div className="font-semibold text-white">{etf.label}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{etf.symbol}</div>
                  </td>
                  <td className="py-3 px-4 align-middle whitespace-nowrap tabular-nums text-zinc-300">
                    {etf.statuses.length}
                  </td>
                  <td className="py-3 px-4 align-middle whitespace-nowrap tabular-nums text-left text-white font-medium">
                    {renderAmount(positionSummary.buyValue)}
                  </td>
                  <td className="py-3 px-4 align-middle whitespace-nowrap tabular-nums text-left text-white font-medium">
                    {renderAmount(positionSummary.totalSellValue)}
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <PositionProfitCell
                      labels={profitLabels}
                      summary={positionSummary}
                      numberFormat={numberFormat}
                    />
                  </td>
                  <td className="w-full p-0" />
                  <td
                    data-etf-row-action
                    className="py-3 pl-2 pr-2 align-middle whitespace-nowrap text-right"
                  >
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        title={t("addTransaction")}
                        onClick={() => {
                          openAddTransaction(etf);
                        }}
                        className="h-8 w-8 p-0 border-zinc-600 text-indigo-300 hover:bg-zinc-700 hover:text-indigo-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                        onClick={() => {
                          openEditEtf(etf);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-zinc-700 hover:text-red-300 cursor-pointer"
                        onClick={() => {
                          if (etf._id) {
                            setDeleteEtfId(etf._id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && etf._id ? (
                  <tr key={`${etf._id}-statuses`} className="border-b border-zinc-700/50">
                    <td colSpan={8} className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-700/50 bg-zinc-900/20">
                            <th className="text-left py-2 px-6 pl-12 text-zinc-400 text-xs font-medium">
                              {t("type")}
                            </th>
                            <th className="text-left py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("date")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("volume")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("actualPrice")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("openingPrice")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("value")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("profitNet")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("profitNetPercent")}
                            </th>
                            <th className="text-center py-2 px-2 text-zinc-400 text-xs font-medium">
                              {tc("actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>{renderTransactions(etf)}</tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-zinc-400">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-between items-center flex-wrap">
        <Dialog
          open={etfDialogOpen}
          onOpenChange={(open) => {
            setEtfDialogOpen(open);
            if (!open) {
              resetEtfForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={beginAddEtf} className={TAB_BUTTON_CLASS.etfs}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addEtf")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingEtf ? t("editEtf") : t("addNewEtf")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleEtfSubmit(e);
              }}
            >
              {editingEtf ? (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <p className="text-zinc-400">{t("symbol")}</p>
                  <p className="text-white font-medium">{etfForm.symbol}</p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="etfSymbol" className="mb-2 block">
                    {t("symbol")}
                  </Label>
                  <Input
                    required
                    id="etfSymbol"
                    maxLength={30}
                    value={etfForm.symbol}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setEtfForm((prev) => ({
                        ...prev,
                        symbol: e.target.value,
                      }));
                    }}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="etfLabel" className="mb-2 block">
                  {t("label")}
                </Label>
                <Input
                  required
                  id="etfLabel"
                  maxLength={200}
                  value={etfForm.label}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setEtfForm((prev) => ({ ...prev, label: e.target.value }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="etfCurrency" className="mb-2 block">
                  {t("currency")}
                </Label>
                <Select
                  value={etfForm.currency}
                  onValueChange={(value) => {
                    setEtfForm((prev) => ({
                      ...prev,
                      currency: value as Currency,
                    }));
                  }}
                >
                  <SelectTrigger
                    id="etfCurrency"
                    className="bg-zinc-700 border-zinc-600 text-white w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {currencyLabel(c, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {etfFormError ? (
                <p className="text-sm text-red-400">{etfFormError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setEtfDialogOpen(false);
                  }}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  className={TAB_BUTTON_CLASS.etfs}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? tc("saving")
                    : editingEtf
                      ? tc("update")
                      : tc("add")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={transactionDialogOpen}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open);
          if (!open) {
            resetTransactionForm();
          }
        }}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction
                ? t("editTransaction")
                : t("addTransaction")}
            </DialogTitle>
          </DialogHeader>
          {transactionEtf ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleTransactionSubmit(e);
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <div>
                  <p className="text-zinc-400">{t("symbol")}</p>
                  <p className="text-white font-medium">
                    {transactionEtf.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">{t("label")}</p>
                  <p className="text-white font-medium">
                    {transactionEtf.label}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">{t("currency")}</p>
                  <p className="text-white font-medium">
                    {currencyLabel(transactionEtf.currency, t)}
                  </p>
                </div>
              </div>
              <div>
                <Label className="mb-2 block" htmlFor="etfTransactionType">
                  {t("type")}
                </Label>
                <Select
                  value={transactionForm.type}
                  onValueChange={(value: TradeType) => {
                    setTransactionForm((prev) => ({ ...prev, type: value }));
                  }}
                >
                  <SelectTrigger
                    id="etfTransactionType"
                    className="bg-zinc-700 border-zinc-600 text-white w-full cursor-pointer"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="BUY">{t("buy")}</SelectItem>
                    <SelectItem value="SELL">{t("sell")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="etfTransactionVolume">
                    {t("volume")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfTransactionVolume"
                    value={transactionForm.volume}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        volume: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label
                    className="mb-2 block"
                    htmlFor="etfTransactionActualPrice"
                  >
                    {t("actualPrice")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfTransactionActualPrice"
                    value={transactionForm.actualPrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        actualPrice: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label
                    className="mb-2 block"
                    htmlFor="etfTransactionOpeningPrice"
                  >
                    {t("openingPrice")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfTransactionOpeningPrice"
                    value={transactionForm.openingPrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setTransactionForm((prev) => ({
                        ...prev,
                        openingPrice: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {transactionFormError ? (
                <p className="text-sm text-red-400">{transactionFormError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setTransactionDialogOpen(false);
                  }}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  className={TAB_BUTTON_CLASS.etfs}
                  disabled={
                    createTransactionMutation.isPending ||
                    updateTransactionMutation.isPending
                  }
                >
                  {createTransactionMutation.isPending ||
                  updateTransactionMutation.isPending
                    ? tc("saving")
                    : editingTransaction
                      ? tc("update")
                      : tc("add")}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {etfs.length > 0 ? (
        <div className="space-y-8">
          {CURRENCIES.map((currency) => {
            const rows = byCurrency[currency];
            if (0 === rows.length) {
              return null;
            }

            return (
              <section
                key={currency}
                className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white pb-4 mb-4 border-b border-zinc-700">
                  {currencyLabel(currency, t)}
                </h3>
                {renderEtfTable(rows)}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <LineChart className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("emptyTitle")}
            </h3>
            <p className="text-zinc-400 mb-6">{t("emptyBody")}</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        title={t("deleteTitle")}
        confirmLabel={tc("delete")}
        open={Boolean(deleteEtfId)}
        description={t("deleteDescription")}
        onConfirm={() => {
          void confirmDeleteEtf();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteEtfId(null);
          }
        }}
      />

      <ConfirmDialog
        confirmLabel={tc("delete")}
        title={t("deleteTransactionTitle")}
        open={Boolean(deleteTransactionTarget)}
        description={t("deleteTransactionDescription")}
        onConfirm={() => {
          void confirmDeleteTransaction();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTransactionTarget(null);
          }
        }}
      />

      <NoticeDialog
        message={noticeMessage ?? ""}
        open={noticeMessage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNoticeMessage(null);
          }
        }}
      />
    </div>
  );
}
