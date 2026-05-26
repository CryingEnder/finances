"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2, Landmark } from "lucide-react";

import type {
  Currency,
  FundUnit,
  FundUnitSummary,
  FundUnitWithCalculations,
} from "../../lib/types";

import { CURRENCIES } from "../../lib/currency";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { formatDisplayDate } from "../../lib/dates";
import { TAB_BUTTON_CLASS } from "../../lib/tab-colors";
import { numberFormatLocale } from "../../lib/number-locale";
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
  useFundUnits,
  useCreateFundUnit,
  useDeleteFundUnit,
  useUpdateFundUnit,
} from "../../lib/hooks/use-fund-units";

function withCalculations(fundUnit: FundUnit): FundUnitWithCalculations {
  const stocksPercent = 100 - fundUnit.bondsPercent;
  const invested = fundUnit.totalValue - fundUnit.profit;
  const profitPercent =
    fundUnit.totalValue > 0 ? (fundUnit.profit / fundUnit.totalValue) * 100 : 0;

  return {
    ...fundUnit,
    stocksPercent,
    invested,
    profitPercent,
  };
}

function summarize(rows: FundUnitWithCalculations[]): FundUnitSummary {
  const summary = rows.reduce(
    (acc, row) => ({
      totalValue: acc.totalValue + row.totalValue,
      totalInvested: acc.totalInvested + row.invested,
      totalProfit: acc.totalProfit + row.profit,
      totalProfitPercent: 0,
    }),
    {
      totalValue: 0,
      totalInvested: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
    },
  );

  summary.totalProfitPercent =
    summary.totalValue > 0
      ? (summary.totalProfit / summary.totalValue) * 100
      : 0;

  return summary;
}

function currencyLabel(
  currency: Currency,
  t: ReturnType<typeof useTranslations<"FundUnits">>,
): string {
  if ("EUR" === currency) {
    return t("currencyEUR");
  }
  if ("USD" === currency) {
    return t("currencyUSD");
  }
  return t("currencyRON");
}

interface FundUnitFormState {
  name: string;
  openedDate: string;
  totalValue: string;
  profit: string;
  bondsPercent: string;
  currency: Currency;
}

const EMPTY_FUND_UNIT_FORM: FundUnitFormState = {
  name: "",
  openedDate: "",
  totalValue: "",
  profit: "",
  bondsPercent: "",
  currency: "EUR",
};

export default function FundUnitsTab() {
  const t = useTranslations("FundUnits");
  const tc = useTranslations("Common");
  const formatError = useApiErrorMessage();
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const { data: fundUnits = [], isLoading } = useFundUnits();
  const createMutation = useCreateFundUnit();
  const updateMutation = useUpdateFundUnit();
  const deleteMutation = useDeleteFundUnit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FundUnit | null>(null);
  const [fundUnitForm, setFundUnitForm] =
    useState<FundUnitFormState>(EMPTY_FUND_UNIT_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const fundUnitsWithCalculations = useMemo(
    () => fundUnits.map(withCalculations),
    [fundUnits],
  );

  const byCurrency = useMemo(() => {
    const grouped: Record<Currency, FundUnitWithCalculations[]> = {
      EUR: [],
      USD: [],
      RON: [],
    };
    for (const fundUnit of fundUnitsWithCalculations) {
      grouped[fundUnit.currency].push(fundUnit);
    }
    return grouped;
  }, [fundUnitsWithCalculations]);

  const formStocksPercent = useMemo(() => {
    const bonds = parseFloat(fundUnitForm.bondsPercent);
    if (Number.isNaN(bonds)) {
      return "";
    }
    const clamped = Math.min(100, Math.max(0, bonds));
    return String(100 - clamped);
  }, [fundUnitForm.bondsPercent]);

  const resetFundUnitForm = () => {
    setFundUnitForm(EMPTY_FUND_UNIT_FORM);
    setEditing(null);
    setFormError("");
  };

  const beginAdd = () => {
    resetFundUnitForm();
  };

  const openEdit = (row: FundUnit) => {
    setEditing(row);
    setFundUnitForm({
      name: row.name,
      openedDate: row.openedDate ?? "",
      totalValue: String(row.totalValue),
      profit: String(row.profit),
      bondsPercent: String(row.bondsPercent),
      currency: row.currency,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const totalValue = parseFloat(fundUnitForm.totalValue);
    const profit = parseFloat(fundUnitForm.profit);
    const bondsPercent = parseFloat(fundUnitForm.bondsPercent);

    if (
      !fundUnitForm.name.trim() ||
      Number.isNaN(totalValue) ||
      Number.isNaN(profit) ||
      Number.isNaN(bondsPercent) ||
      bondsPercent < 0 ||
      bondsPercent > 100
    ) {
      setFormError(t("errRequired"));
      return;
    }

    if (totalValue - profit < 0) {
      setFormError(t("errInvestedNegative"));
      return;
    }

    const payload: Omit<FundUnit, "_id" | "date"> = {
      name: fundUnitForm.name.trim(),
      openedDate: fundUnitForm.openedDate.trim() || undefined,
      totalValue,
      profit,
      bondsPercent,
      currency: fundUnitForm.currency,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ ...payload, _id: editing._id });
      } else {
        await createMutation.mutateAsync(payload);
      }

      resetFundUnitForm();
      setDialogOpen(false);
    } catch (err) {
      setFormError(formatError(err, t("failedSave")));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) {
      return;
    }
    const id = deleteTargetId;
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteTargetId(null);
    } catch (err) {
      console.error(err);
      setNoticeMessage(formatError(err, t("failedDelete")));
      setDeleteTargetId(null);
    }
  };

  const renderSummaryCards = (rowSummary: FundUnitSummary) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalValue")}</p>
        <p className="text-lg font-bold text-white">
          {rowSummary.totalValue.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalInvested")}</p>
        <p className="text-lg font-bold text-white">
          {rowSummary.totalInvested.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalProfit")}</p>
        <p
          className={`text-lg font-bold ${
            rowSummary.totalProfit >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {rowSummary.totalProfit.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalProfitPercent")}</p>
        <p
          className={`text-lg font-bold ${
            rowSummary.totalProfitPercent >= 0
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {rowSummary.totalProfitPercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );

  const renderTable = (rows: FundUnitWithCalculations[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-3 px-2 text-zinc-300">{t("name")}</th>
            <th className="text-left py-3 px-2 text-zinc-300">
              {t("openedDate")}
            </th>
            <th className="text-left py-3 px-2 text-zinc-300">{t("date")}</th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("totalValue")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {tc("profit")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {tc("profitPercent")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("bondsPercent")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("stocksPercent")}
            </th>
            <th className="text-center py-3 px-2 text-zinc-300">
              {tc("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-b border-zinc-700/50">
              <td className="py-3 px-2 font-semibold text-white">{row.name}</td>
              <td className="py-3 px-2 text-zinc-300">
                {row.openedDate
                  ? formatDisplayDate(row.openedDate)
                  : tc("emDash")}
              </td>
              <td className="py-3 px-2 text-zinc-300">
                {row.date ? formatDisplayDate(row.date) : tc("emDash")}
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {row.totalValue.toLocaleString(numberFormat, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td
                className={`py-3 px-2 text-right font-semibold ${
                  row.profit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {row.profit.toLocaleString(numberFormat, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td
                className={`py-3 px-2 text-right font-semibold ${
                  row.profitPercent >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {row.profitPercent.toFixed(2)}%
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {row.bondsPercent.toFixed(2)}%
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {row.stocksPercent.toFixed(2)}%
              </td>
              <td className="py-3 px-2 text-center">
                <div className="flex gap-1 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openEdit(row);
                    }}
                    className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-zinc-700 hover:text-red-300 cursor-pointer"
                    onClick={() => {
                      if (row._id) {
                        setDeleteTargetId(row._id);
                      }
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
  );

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-between items-center flex-wrap">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetFundUnitForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={beginAdd} className={TAB_BUTTON_CLASS.fundUnits}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addFundUnit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editing ? t("editFundUnit") : t("addNewFundUnit")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div>
                <Label className="mb-2 block" htmlFor="fundUnitName">
                  {t("name")}
                </Label>
                <Input
                  required
                  maxLength={200}
                  id="fundUnitName"
                  value={fundUnitForm.name}
                  disabled={Boolean(editing)}
                  className="bg-zinc-700 border-zinc-600 text-white disabled:opacity-60"
                  onChange={(e) => {
                    setFundUnitForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                  }}
                />
                {editing ? (
                  <p className="text-xs text-zinc-400 mt-1">
                    {t("nameLocked")}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="mb-2 block" htmlFor="fundUnitCurrency">
                  {t("currency")}
                </Label>
                <Select
                  value={fundUnitForm.currency}
                  onValueChange={(value) => {
                    setFundUnitForm((prev) => ({
                      ...prev,
                      currency: value as Currency,
                    }));
                  }}
                >
                  <SelectTrigger
                    id="fundUnitCurrency"
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
              <div>
                <Label className="mb-2 block" htmlFor="fundUnitOpenedDate">
                  {t("openedDateOptional")}
                </Label>
                <Input
                  type="date"
                  id="fundUnitOpenedDate"
                  value={fundUnitForm.openedDate}
                  className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                  onChange={(e) => {
                    setFundUnitForm((prev) => ({
                      ...prev,
                      openedDate: e.target.value,
                    }));
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="fundUnitTotalValue">
                    {t("totalValue")}
                  </Label>
                  <Input
                    required
                    min="0.01"
                    step="any"
                    type="number"
                    id="fundUnitTotalValue"
                    value={fundUnitForm.totalValue}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFundUnitForm((prev) => ({
                        ...prev,
                        totalValue: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="fundUnitProfit">
                    {tc("profit")}
                  </Label>
                  <Input
                    required
                    step="any"
                    type="number"
                    id="fundUnitProfit"
                    value={fundUnitForm.profit}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFundUnitForm((prev) => ({
                        ...prev,
                        profit: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="fundUnitBondsPercent">
                    {t("bondsPercent")}
                  </Label>
                  <Input
                    min="0"
                    required
                    max="100"
                    step="any"
                    type="number"
                    id="fundUnitBondsPercent"
                    value={fundUnitForm.bondsPercent}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFundUnitForm((prev) => ({
                        ...prev,
                        bondsPercent: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="fundUnitStocksPercent">
                    {t("stocksPercent")}
                  </Label>
                  <Input
                    readOnly
                    value={formStocksPercent}
                    id="fundUnitStocksPercent"
                    className="bg-zinc-700/50 border-zinc-600 text-zinc-300 cursor-not-allowed"
                  />
                </div>
              </div>

              {formError ? (
                <p className="text-sm text-red-400">{formError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setDialogOpen(false);
                  }}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  className={TAB_BUTTON_CLASS.fundUnits}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? tc("saving")
                    : editing
                      ? tc("update")
                      : tc("add")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fundUnitsWithCalculations.length > 0 ? (
        <div className="space-y-8">
          {CURRENCIES.map((currency) => {
            const rows = byCurrency[currency];
            if (0 === rows.length) {
              return null;
            }

            const currencySummary = summarize(rows);

            return (
              <section
                key={currency}
                className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white pb-4 mb-4 border-b border-zinc-700">
                  {currencyLabel(currency, t)}
                </h3>
                {renderSummaryCards(currencySummary)}
                {renderTable(rows)}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <Landmark className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
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
        open={Boolean(deleteTargetId)}
        description={t("deleteDescription")}
        onConfirm={() => {
          void confirmDelete();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
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
