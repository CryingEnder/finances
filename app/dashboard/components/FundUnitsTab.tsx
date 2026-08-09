"use client";

import { useMemo, Fragment, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Edit,
  Plus,
  Trash2,
  Landmark,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import type {
  Currency,
  FundUnit,
  TradeType,
  FundUnitStatus,
  FundUnitStatusWithCalculations,
} from "../../lib/types";

import { CURRENCIES } from "../../lib/currency";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { TAB_BUTTON_CLASS } from "../../lib/tab-colors";
import { numberFormatLocale } from "../../lib/number-locale";
import { InfoTooltip } from "../../components/ui/info-tooltip";
import { useApiErrorMessage } from "../../lib/hooks/use-api-error-message";
import {
  NoticeDialog,
  ConfirmDialog,
} from "../../components/ui/confirm-dialog";
import {
  todayIsoDate,
  toIsoDateOnly,
  formatDisplayDate,
} from "../../lib/dates";
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
  statusDisplayDate,
  summarizeFundUnitPosition,
  sortFundUnitStatusesByNewest,
  calculateFundUnitStatusMetrics,
} from "../../lib/fund-unit-utils";
import {
  useFundUnits,
  useCreateFundUnit,
  useDeleteFundUnit,
  useUpdateFundUnit,
  useCreateFundUnitStatus,
  useDeleteFundUnitStatus,
  useUpdateFundUnitStatus,
} from "../../lib/hooks/use-fund-units";

import {
  PositionProfitCell,
  PositionProfitColumnHeader,
} from "./position-profit-cell";

function withStatusCalculations(
  status: FundUnitStatus,
): FundUnitStatusWithCalculations {
  const { invested, profitPercent } = calculateFundUnitStatusMetrics(status);

  return {
    ...status,
    invested,
    profitPercent,
  };
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
  bondsPercent: string;
  currency: Currency;
}

interface StatusFormState {
  type: TradeType;
  date: string;
  totalValue: string;
  profit: string;
}

const EMPTY_FUND_UNIT_FORM: FundUnitFormState = {
  name: "",
  openedDate: "",
  bondsPercent: "",
  currency: "EUR",
};

const EMPTY_STATUS_FORM: StatusFormState = {
  type: "BUY",
  date: "",
  totalValue: "",
  profit: "",
};

export default function FundUnitsTab() {
  const t = useTranslations("FundUnits");
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

  const { data: fundUnits = [], isLoading } = useFundUnits();
  const createMutation = useCreateFundUnit();
  const updateMutation = useUpdateFundUnit();
  const deleteMutation = useDeleteFundUnit();
  const createStatusMutation = useCreateFundUnitStatus();
  const updateStatusMutation = useUpdateFundUnitStatus();
  const deleteStatusMutation = useDeleteFundUnitStatus();

  const [fundUnitDialogOpen, setFundUnitDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingFundUnit, setEditingFundUnit] = useState<FundUnit | null>(null);
  const [statusFundUnit, setStatusFundUnit] = useState<FundUnit | null>(null);
  const [editingStatus, setEditingStatus] = useState<FundUnitStatus | null>(
    null,
  );
  const [fundUnitForm, setFundUnitForm] =
    useState<FundUnitFormState>(EMPTY_FUND_UNIT_FORM);
  const [statusForm, setStatusForm] =
    useState<StatusFormState>(EMPTY_STATUS_FORM);
  const [fundUnitFormError, setFundUnitFormError] = useState("");
  const [statusFormError, setStatusFormError] = useState("");
  const [expandedFundUnitIds, setExpandedFundUnitIds] = useState<
    Record<string, boolean>
  >({});
  const [deleteFundUnitId, setDeleteFundUnitId] = useState<string | null>(null);
  const [deleteStatusTarget, setDeleteStatusTarget] = useState<{
    fundUnitId: string;
    statusId: string;
  } | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const byCurrency = useMemo(() => {
    const grouped: Record<Currency, FundUnit[]> = {
      EUR: [],
      USD: [],
      RON: [],
    };
    for (const fundUnit of fundUnits) {
      grouped[fundUnit.currency].push(fundUnit);
    }
    return grouped;
  }, [fundUnits]);

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
    setEditingFundUnit(null);
    setFundUnitFormError("");
  };

  const resetStatusForm = () => {
    setStatusForm(EMPTY_STATUS_FORM);
    setStatusFundUnit(null);
    setEditingStatus(null);
    setStatusFormError("");
  };

  const beginAddFundUnit = () => {
    resetFundUnitForm();
  };

  const openEditFundUnit = (fundUnit: FundUnit) => {
    setEditingFundUnit(fundUnit);
    setFundUnitForm({
      name: fundUnit.name,
      openedDate: fundUnit.openedDate ?? "",
      bondsPercent: String(fundUnit.bondsPercent),
      currency: fundUnit.currency,
    });
    setFundUnitFormError("");
    setFundUnitDialogOpen(true);
  };

  const openAddStatus = (fundUnit: FundUnit) => {
    setStatusFundUnit(fundUnit);
    setEditingStatus(null);
    setStatusForm({
      ...EMPTY_STATUS_FORM,
      date: todayIsoDate(),
    });
    setStatusFormError("");
    setStatusDialogOpen(true);
  };

  const openEditStatus = (fundUnit: FundUnit, status: FundUnitStatus) => {
    setStatusFundUnit(fundUnit);
    setEditingStatus(status);
    setStatusForm({
      type: status.type,
      date: toIsoDateOnly(status.date),
      totalValue: String(status.totalValue),
      profit: String(status.profit),
    });
    setStatusFormError("");
    setStatusDialogOpen(true);
  };

  const toggleExpanded = (fundUnitId: string) => {
    setExpandedFundUnitIds((prev) => ({
      ...prev,
      [fundUnitId]: !prev[fundUnitId],
    }));
  };

  const handleFundUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundUnitFormError("");

    const bondsPercent = parseFloat(fundUnitForm.bondsPercent);

    if (
      !fundUnitForm.name.trim() ||
      Number.isNaN(bondsPercent) ||
      bondsPercent < 0 ||
      bondsPercent > 100
    ) {
      setFundUnitFormError(t("errRequired"));
      return;
    }

    const payload = {
      name: fundUnitForm.name.trim(),
      openedDate: fundUnitForm.openedDate.trim() || undefined,
      bondsPercent,
      currency: fundUnitForm.currency,
    };

    try {
      if (editingFundUnit) {
        await updateMutation.mutateAsync({
          _id: editingFundUnit._id,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      resetFundUnitForm();
      setFundUnitDialogOpen(false);
    } catch (err) {
      setFundUnitFormError(formatError(err, t("failedSave")));
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFormError("");

    if (!statusFundUnit?._id) {
      return;
    }

    const totalValue = parseFloat(statusForm.totalValue);
    const profit = parseFloat(statusForm.profit);

    if (
      !statusForm.date.trim() ||
      Number.isNaN(totalValue) ||
      Number.isNaN(profit)
    ) {
      setStatusFormError(t("errRequired"));
      return;
    }

    if (totalValue - profit < 0) {
      setStatusFormError(t("errInvestedNegative"));
      return;
    }

    const date = statusForm.date.trim();

    try {
      if (editingStatus?._id) {
        await updateStatusMutation.mutateAsync({
          fundUnitId: statusFundUnit._id,
          statusId: editingStatus._id,
          type: statusForm.type,
          date,
          totalValue,
          profit,
        });
      } else {
        await createStatusMutation.mutateAsync({
          fundUnitId: statusFundUnit._id,
          name: statusFundUnit.name,
          type: statusForm.type,
          date,
          totalValue,
          profit,
        });
      }

      resetStatusForm();
      setStatusDialogOpen(false);
      setExpandedFundUnitIds((prev) => ({
        ...prev,
        [statusFundUnit._id!]: true,
      }));
    } catch (err) {
      setStatusFormError(formatError(err, t("failedSaveStatus")));
    }
  };

  const confirmDeleteFundUnit = async () => {
    if (!deleteFundUnitId) {
      return;
    }
    const id = deleteFundUnitId;
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteFundUnitId(null);
      setExpandedFundUnitIds((prev) => {
        const { [id]: _removed, ...next } = prev;
        return next;
      });
    } catch (err) {
      setNoticeMessage(formatError(err, t("failedDelete")));
      setDeleteFundUnitId(null);
    }
  };

  const confirmDeleteStatus = async () => {
    if (!deleteStatusTarget) {
      return;
    }
    const target = deleteStatusTarget;
    try {
      await deleteStatusMutation.mutateAsync(target);
      setDeleteStatusTarget(null);
    } catch (err) {
      setNoticeMessage(formatError(err, t("failedDeleteStatus")));
      setDeleteStatusTarget(null);
    }
  };

  const renderStatusTypeBadge = (type: TradeType) => (
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

  const renderStatuses = (fundUnit: FundUnit) => {
    const statuses = sortFundUnitStatusesByNewest(fundUnit.statuses).map(
      withStatusCalculations,
    );

    if (0 === statuses.length) {
      return (
        <tr>
          <td colSpan={6} className="py-4 px-6 text-sm text-zinc-400 italic">
            {t("noStatusesYet")}
          </td>
        </tr>
      );
    }

    return statuses.map((status) => (
      <tr
        key={status._id}
        className="border-b border-zinc-700/30 bg-zinc-900/30"
      >
        <td className="py-2.5 px-6 pl-12">
          {renderStatusTypeBadge(status.type)}
        </td>
        <td className="py-2.5 px-2 text-zinc-300">
          {formatDisplayDate(statusDisplayDate(status))}
        </td>
        <td className="py-2.5 px-2 text-white text-right font-medium">
          {renderAmount(status.totalValue)}
        </td>
        <td
          className={`py-2.5 px-2 text-right font-semibold ${
            status.profit >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {renderAmount(status.profit)}
        </td>
        <td
          className={`py-2.5 px-2 text-right font-semibold ${
            status.profitPercent >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {status.profitPercent.toFixed(2)}%
        </td>
        <td className="py-2.5 px-2 text-center">
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                openEditStatus(fundUnit, status);
              }}
              className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={deleteStatusMutation.isPending}
              className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-zinc-700 hover:text-red-300 cursor-pointer"
              onClick={() => {
                if (fundUnit._id && status._id) {
                  setDeleteStatusTarget({
                    fundUnitId: fundUnit._id,
                    statusId: status._id,
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

  const renderFundUnitTable = (rows: FundUnit[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="w-10 py-3 pl-2 pr-0" />
            <th className="py-3 pl-1 pr-6 text-left text-zinc-300 whitespace-nowrap">
              {t("position")}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {t("statusesCount")}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {renderColumnHeader(t("buyValue"), t("buyValueTooltip"))}
            </th>
            <th className="py-3 px-4 text-left text-zinc-300 whitespace-nowrap">
              {renderColumnHeader(
                t("totalSellValue"),
                t("totalSellValueTooltip"),
              )}
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
          {rows.map((fundUnit) => {
            const isExpanded = Boolean(
              fundUnit._id && expandedFundUnitIds[fundUnit._id],
            );
            const positionSummary = summarizeFundUnitPosition(fundUnit);
            const stocksPercent = 100 - fundUnit.bondsPercent;

            return (
              <Fragment key={fundUnit._id}>
                <tr
                  className="border-b border-zinc-700/50 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  onPointerDown={(e) => {
                    if (0 !== e.button) {
                      return;
                    }
                    if (
                      (e.target as HTMLElement).closest(
                        "[data-fund-unit-row-action]",
                      )
                    ) {
                      return;
                    }
                    if (fundUnit._id) {
                      toggleExpanded(fundUnit._id);
                    }
                  }}
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
                  <td className="py-3 pl-1 pr-6 align-middle max-w-md min-w-56">
                    <div className="font-semibold text-white">
                      {fundUnit.name}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 space-y-0.5 whitespace-normal">
                      {fundUnit.openedDate ? (
                        <div>
                          {t("openedDate")}:{" "}
                          {formatDisplayDate(fundUnit.openedDate)}
                        </div>
                      ) : null}
                      <div>
                        {t("bondsPercent")} {fundUnit.bondsPercent.toFixed(0)}%
                        {" · "}
                        {t("stocksPercent")} {stocksPercent.toFixed(0)}%
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle whitespace-nowrap tabular-nums text-zinc-300">
                    {fundUnit.statuses.length}
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
                    data-fund-unit-row-action
                    className="py-3 pl-2 pr-2 align-middle whitespace-nowrap text-right"
                  >
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        title={t("addStatus")}
                        onClick={() => {
                          openAddStatus(fundUnit);
                        }}
                        className="h-8 w-8 p-0 border-zinc-600 text-green-300 hover:bg-zinc-700 hover:text-green-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                        onClick={() => {
                          openEditFundUnit(fundUnit);
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
                          if (fundUnit._id) {
                            setDeleteFundUnitId(fundUnit._id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && fundUnit._id ? (
                  <tr
                    key={`${fundUnit._id}-statuses`}
                    className="border-b border-zinc-700/50"
                  >
                    <td colSpan={8} className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-700/50 bg-zinc-900/20">
                            <th className="text-left py-2 px-6 pl-12 text-zinc-400 text-xs font-medium">
                              {t("type")}
                            </th>
                            <th className="text-left py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("statusDate")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {t("totalValue")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {tc("profit")}
                            </th>
                            <th className="text-right py-2 px-2 text-zinc-400 text-xs font-medium">
                              {tc("profitPercent")}
                            </th>
                            <th className="text-center py-2 px-2 text-zinc-400 text-xs font-medium">
                              {tc("actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>{renderStatuses(fundUnit)}</tbody>
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
          open={fundUnitDialogOpen}
          onOpenChange={(open) => {
            setFundUnitDialogOpen(open);
            if (!open) {
              resetFundUnitForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={beginAddFundUnit}
              className={TAB_BUTTON_CLASS.fundUnits}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addFundUnit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingFundUnit ? t("editFundUnit") : t("addNewFundUnit")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleFundUnitSubmit(e);
              }}
            >
              {editingFundUnit ? (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <p className="text-zinc-400">{t("name")}</p>
                  <p className="text-white font-medium">{fundUnitForm.name}</p>
                </div>
              ) : (
                <div>
                  <Label className="mb-2 block" htmlFor="fundUnitName">
                    {t("name")}
                  </Label>
                  <Input
                    required
                    maxLength={200}
                    id="fundUnitName"
                    value={fundUnitForm.name}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setFundUnitForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                    }}
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    {t("nameUnique")}
                  </p>
                </div>
              )}
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

              {fundUnitFormError ? (
                <p className="text-sm text-red-400">{fundUnitFormError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setFundUnitDialogOpen(false);
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
                    : editingFundUnit
                      ? tc("update")
                      : tc("add")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) {
            resetStatusForm();
          }
        }}
      >
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? t("editStatus") : t("addStatus")}
            </DialogTitle>
          </DialogHeader>
          {statusFundUnit ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleStatusSubmit(e);
              }}
            >
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <p className="text-zinc-400">{t("name")}</p>
                <p className="text-white font-medium">{statusFundUnit.name}</p>
              </div>
              <div>
                <Label htmlFor="statusType" className="mb-2 block">
                  {t("type")}
                </Label>
                <Select
                  value={statusForm.type}
                  onValueChange={(value: TradeType) => {
                    setStatusForm((prev) => ({ ...prev, type: value }));
                  }}
                >
                  <SelectTrigger
                    id="statusType"
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
              <div>
                <Label htmlFor="statusDate" className="mb-2 block">
                  {t("statusDate")}
                </Label>
                <Input
                  required
                  type="date"
                  id="statusDate"
                  value={statusForm.date}
                  className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                  onChange={(e) => {
                    setStatusForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }));
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="statusTotalValue">
                    {t("totalValue")}
                  </Label>
                  <Input
                    required
                    min="0.01"
                    step="any"
                    type="number"
                    id="statusTotalValue"
                    value={statusForm.totalValue}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setStatusForm((prev) => ({
                        ...prev,
                        totalValue: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="statusProfit">
                    {tc("profit")}
                  </Label>
                  <Input
                    required
                    step="any"
                    type="number"
                    id="statusProfit"
                    value={statusForm.profit}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setStatusForm((prev) => ({
                        ...prev,
                        profit: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {statusFormError ? (
                <p className="text-sm text-red-400">{statusFormError}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setStatusDialogOpen(false);
                  }}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="submit"
                  className={TAB_BUTTON_CLASS.fundUnits}
                  disabled={
                    createStatusMutation.isPending ||
                    updateStatusMutation.isPending
                  }
                >
                  {createStatusMutation.isPending ||
                  updateStatusMutation.isPending
                    ? tc("saving")
                    : editingStatus
                      ? tc("update")
                      : tc("add")}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {fundUnits.length > 0 ? (
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
                {renderFundUnitTable(rows)}
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
        open={Boolean(deleteFundUnitId)}
        description={t("deleteDescription")}
        onConfirm={() => {
          void confirmDeleteFundUnit();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFundUnitId(null);
          }
        }}
      />

      <ConfirmDialog
        confirmLabel={tc("delete")}
        title={t("deleteStatusTitle")}
        open={Boolean(deleteStatusTarget)}
        description={t("deleteStatusDescription")}
        onConfirm={() => {
          void confirmDeleteStatus();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteStatusTarget(null);
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
