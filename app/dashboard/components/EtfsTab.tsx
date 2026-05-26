"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2, LineChart } from "lucide-react";

import type {
  Etf,
  EtfSummary,
  EtfCurrency,
  EtfWithCalculations,
} from "../../lib/types";

import { formatPrice } from "../../lib/utils";
import { ETF_CURRENCIES } from "../../lib/types";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { formatDisplayDate } from "../../lib/dates";
import { numberFormatLocale } from "../../lib/number-locale";
import {
  NoticeDialog,
  ConfirmDialog,
} from "../../components/ui/confirm-dialog";
import {
  useEtfs,
  useCreateEtf,
  useDeleteEtf,
  useUpdateEtf,
} from "../../lib/hooks/use-etfs";
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

function withCalculations(etf: Etf): EtfWithCalculations {
  const purchaseCost = etf.volume * etf.openingPrice;
  const value = etf.volume * etf.actualPrice;
  const profitNet = value - purchaseCost;
  const profitNetPercent =
    purchaseCost > 0 ? (profitNet / purchaseCost) * 100 : 0;

  return {
    ...etf,
    value,
    purchaseCost,
    profitNet,
    profitNetPercent,
  };
}

function summarize(rows: EtfWithCalculations[]): EtfSummary {
  const summary = rows.reduce(
    (acc, etf) => ({
      totalValue: acc.totalValue + etf.value,
      totalPurchaseCost: acc.totalPurchaseCost + etf.purchaseCost,
      totalProfitNet: acc.totalProfitNet + etf.profitNet,
      totalProfitNetPercent: 0,
    }),
    {
      totalValue: 0,
      totalPurchaseCost: 0,
      totalProfitNet: 0,
      totalProfitNetPercent: 0,
    },
  );

  summary.totalProfitNetPercent =
    summary.totalPurchaseCost > 0
      ? (summary.totalProfitNet / summary.totalPurchaseCost) * 100
      : 0;

  return summary;
}

function currencyLabel(
  currency: EtfCurrency,
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

export default function EtfsTab() {
  const t = useTranslations("Etfs");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const { data: etfs = [], isLoading } = useEtfs();
  const createMutation = useCreateEtf();
  const updateMutation = useUpdateEtf();
  const deleteMutation = useDeleteEtf();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Etf | null>(null);
  const [formSymbol, setFormSymbol] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formVolume, setFormVolume] = useState("");
  const [formActualPrice, setFormActualPrice] = useState("");
  const [formOpeningPrice, setFormOpeningPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState<EtfCurrency>("EUR");
  const [formError, setFormError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const etfsWithCalculations = useMemo(
    () => etfs.map(withCalculations),
    [etfs],
  );

  const byCurrency = useMemo(() => {
    const grouped: Record<EtfCurrency, EtfWithCalculations[]> = {
      EUR: [],
      USD: [],
      RON: [],
    };
    for (const etf of etfsWithCalculations) {
      grouped[etf.currency].push(etf);
    }
    return grouped;
  }, [etfsWithCalculations]);

  const beginAdd = () => {
    setEditing(null);
    setFormError("");
    setFormSymbol("");
    setFormLabel("");
    setFormVolume("");
    setFormActualPrice("");
    setFormOpeningPrice("");
    setFormCurrency("EUR");
  };

  const openEdit = (row: Etf) => {
    setEditing(row);
    setFormSymbol(row.symbol);
    setFormLabel(row.label);
    setFormVolume(String(row.volume));
    setFormActualPrice(String(row.actualPrice));
    setFormOpeningPrice(String(row.openingPrice));
    setFormCurrency(row.currency);
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const volume = parseFloat(formVolume);
    const actualPrice = parseFloat(formActualPrice);
    const openingPrice = parseFloat(formOpeningPrice);

    if (
      !formSymbol.trim() ||
      !formLabel.trim() ||
      Number.isNaN(volume) ||
      Number.isNaN(actualPrice) ||
      Number.isNaN(openingPrice)
    ) {
      setFormError(t("errRequired"));
      return;
    }

    const payload: Omit<Etf, "_id" | "date"> = {
      symbol: formSymbol.trim(),
      label: formLabel.trim(),
      volume,
      actualPrice,
      openingPrice,
      currency: formCurrency,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ ...payload, _id: editing._id });
      } else {
        await createMutation.mutateAsync(payload);
      }

      beginAdd();
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("failedSave");
      setFormError(
        "No changes to save" === message ? t("errNoChanges") : message,
      );
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
      setNoticeMessage(err instanceof Error ? err.message : t("failedDelete"));
      setDeleteTargetId(null);
    }
  };

  const renderSummaryCards = (summary: EtfSummary) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalValue")}</p>
        <p className="text-lg font-bold text-white">
          {summary.totalValue.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalCost")}</p>
        <p className="text-lg font-bold text-white">
          {summary.totalPurchaseCost.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">{t("totalProfitNet")}</p>
        <p
          className={`text-lg font-bold ${
            summary.totalProfitNet >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {summary.totalProfitNet.toLocaleString(numberFormat, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-700/80 rounded-lg p-3">
        <p className="text-zinc-400 text-xs mb-1">
          {t("totalProfitNetPercent")}
        </p>
        <p
          className={`text-lg font-bold ${
            summary.totalProfitNetPercent >= 0
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {summary.totalProfitNetPercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );

  const renderTable = (rows: EtfWithCalculations[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-3 px-2 text-zinc-300">
              {t("position")}
            </th>
            <th className="text-left py-3 px-2 text-zinc-300">{t("date")}</th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("volume")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">{t("value")}</th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("actualPrice")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("openingPrice")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("profitNet")}
            </th>
            <th className="text-right py-3 px-2 text-zinc-300">
              {t("profitNetPercent")}
            </th>
            <th className="text-center py-3 px-2 text-zinc-300">
              {tc("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((etf) => (
            <tr key={etf._id} className="border-b border-zinc-700/50">
              <td className="py-3 px-2">
                <div className="font-semibold text-white">{etf.label}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{etf.symbol}</div>
              </td>
              <td className="py-3 px-2 text-zinc-300">
                {etf.date ? formatDisplayDate(etf.date) : tc("emDash")}
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {etf.volume.toLocaleString(numberFormat, {
                  maximumFractionDigits: 4,
                })}
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {etf.value.toLocaleString(numberFormat, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {formatPrice(etf.actualPrice)}
              </td>
              <td className="py-3 px-2 text-white text-right font-medium">
                {formatPrice(etf.openingPrice)}
              </td>
              <td
                className={`py-3 px-2 text-right font-semibold ${
                  etf.profitNet >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {etf.profitNet.toLocaleString(numberFormat, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td
                className={`py-3 px-2 text-right font-semibold ${
                  etf.profitNetPercent >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {etf.profitNetPercent.toFixed(2)}%
              </td>
              <td className="py-3 px-2 text-center">
                <div className="flex gap-1 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openEdit(etf);
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
                      if (etf._id) {
                        setDeleteTargetId(etf._id);
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
              beginAdd();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={beginAdd}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addEtf")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editing ? t("editEtf") : t("addNewEtf")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div>
                <Label htmlFor="etfSymbol" className="mb-2 block">
                  {t("symbol")}
                </Label>
                <Input
                  required
                  id="etfSymbol"
                  maxLength={30}
                  value={formSymbol}
                  disabled={Boolean(editing)}
                  className="bg-zinc-700 border-zinc-600 text-white disabled:opacity-60"
                  onChange={(e) => {
                    setFormSymbol(e.target.value);
                  }}
                />
                {editing ? (
                  <p className="text-xs text-zinc-400 mt-1">
                    {t("symbolLocked")}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="etfLabel" className="mb-2 block">
                  {t("label")}
                </Label>
                <Input
                  required
                  id="etfLabel"
                  maxLength={200}
                  value={formLabel}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setFormLabel(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="etfCurrency" className="mb-2 block">
                  {t("currency")}
                </Label>
                <Select
                  value={formCurrency}
                  onValueChange={(value) => {
                    setFormCurrency(value as EtfCurrency);
                  }}
                >
                  <SelectTrigger
                    id="etfCurrency"
                    className="bg-zinc-700 border-zinc-600 text-white w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {ETF_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {currencyLabel(c, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="etfVolume" className="mb-2 block">
                    {t("volume")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfVolume"
                    value={formVolume}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFormVolume(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="etfActualPrice">
                    {t("actualPrice")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfActualPrice"
                    value={formActualPrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFormActualPrice(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="etfOpeningPrice">
                    {t("openingPrice")}
                  </Label>
                  <Input
                    required
                    step="any"
                    min="0.0001"
                    type="number"
                    id="etfOpeningPrice"
                    value={formOpeningPrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFormOpeningPrice(e.target.value);
                    }}
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
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
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

      {etfsWithCalculations.length > 0 ? (
        <div className="space-y-8">
          {ETF_CURRENCIES.map((currency) => {
            const rows = byCurrency[currency];
            if (0 === rows.length) {
              return null;
            }

            const summary = summarize(rows);

            return (
              <section
                key={currency}
                className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white pb-4 mb-4 border-b border-zinc-700">
                  {currencyLabel(currency, t)}
                </h3>
                {renderSummaryCards(summary)}
                {renderTable(rows)}
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
