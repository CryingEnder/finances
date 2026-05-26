"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Coins, Trash2 } from "lucide-react";

import type { Dividend } from "../../lib/types";

import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { useCompanies } from "../../lib/hooks/use-companies";
import { numberFormatLocale } from "../../lib/number-locale";
import { useApiErrorMessage } from "../../lib/hooks/use-api-error-message";
import { getIsoYear, todayIsoDate, formatDisplayDate } from "../../lib/dates";
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
  useDividends,
  useCreateDividend,
  useDeleteDividend,
  useUpdateDividend,
} from "../../lib/hooks/use-dividends";

export default function DividendsTab() {
  const t = useTranslations("Dividends");
  const tc = useTranslations("Common");
  const formatError = useApiErrorMessage();
  const locale = useLocale();
  const numberFormat = numberFormatLocale(locale);

  const { data: dividends = [], isLoading } = useDividends();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createMutation = useCreateDividend();
  const updateMutation = useUpdateDividend();
  const deleteMutation = useDeleteDividend();

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dividend | null>(null);
  const [formIsin, setFormIsin] = useState<string>("");
  const [formDate, setFormDate] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const filterYearOptions = useMemo(() => {
    const years = [...new Set(dividends.map((d) => getIsoYear(d.date)))].sort(
      (a, b) => b - a,
    );
    return years;
  }, [dividends]);

  const resolvedFilterYear = useMemo(() => {
    if ("all" === selectedYear) {
      return "all";
    }
    const y = parseInt(selectedYear, 10);
    if (Number.isNaN(y) || !filterYearOptions.includes(y)) {
      return "all";
    }
    return selectedYear;
  }, [filterYearOptions, selectedYear]);

  const filtered = useMemo(() => {
    if ("all" === resolvedFilterYear) {
      return dividends;
    }
    const y = parseInt(resolvedFilterYear, 10);
    return dividends.filter((d) => getIsoYear(d.date) === y);
  }, [dividends, resolvedFilterYear]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, d) => sum + d.amount, 0),
    [filtered],
  );

  const beginAddDividend = () => {
    setEditing(null);
    setFormError("");
    setFormIsin("");
    setFormDate(todayIsoDate());
    setFormAmount("");
    setFormNotes("");
  };

  const openEdit = (row: Dividend) => {
    setEditing(row);
    setFormIsin(row.isin);
    setFormDate(row.date);
    setFormAmount(String(row.amount));
    setFormNotes(row.notes ?? "");
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const amount = parseFloat(formAmount);

    try {
      if (!formDate || Number.isNaN(amount)) {
        setFormError(t("errDateAmount"));
        return;
      }

      const company = companies.find((c) => c.isin === formIsin);
      if (!company) {
        setFormError(t("errSelectCompany"));
        return;
      }

      const payload: Omit<Dividend, "_id"> = {
        instrument: company.instrument,
        isin: company.isin,
        issuer: company.issuer,
        date: formDate,
        amount,
      };

      if (formNotes.trim().length > 0) {
        payload.notes = formNotes.trim();
      }

      if (editing) {
        await updateMutation.mutateAsync({ ...payload, _id: editing._id });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setEditing(null);
      setFormIsin("");
      setFormDate("");
      setFormAmount("");
      setFormNotes("");
      setFormError("");
      setDialogOpen(false);
    } catch (err) {
      setFormError(formatError(err, t("failedSave")));
    }
  };

  const confirmDeleteDividend = async () => {
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

  if (isLoading || companiesLoading) {
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
              setEditing(null);
              setFormIsin("");
              setFormError("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              disabled={0 === companies.length}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              onClick={() => {
                beginAddDividend();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("addButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editing ? t("editEntry") : t("addEntry")}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div>
                <Label htmlFor="div-company" className="mb-2 block">
                  {tc("company")}
                </Label>
                <Select
                  value={formIsin}
                  onValueChange={(isin) => {
                    setFormIsin(isin);
                    setFormError("");
                  }}
                >
                  <SelectTrigger
                    id="div-company"
                    className="bg-zinc-700 border-zinc-600 text-white cursor-pointer w-full"
                  >
                    <SelectValue placeholder={tc("selectCompany")} />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-700 border-zinc-600 max-h-64">
                    {companies.length > 0 ? (
                      companies.map((c) => (
                        <SelectItem
                          value={c.isin}
                          key={c._id ?? c.isin}
                          className="cursor-pointer"
                        >
                          {c.instrument} — {c.issuer} ({c.isin})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-zinc-400">
                        {t("noCompaniesHint")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="div-date" className="mb-2 block">
                  {tc("date")}
                </Label>
                <Input
                  required
                  type="date"
                  id="div-date"
                  value={formDate}
                  onChange={(e) => {
                    setFormDate(e.target.value);
                  }}
                  className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>

              <div>
                <Label htmlFor="div-amount" className="mb-2 block">
                  {t("totalAmountRon")}
                </Label>
                <Input
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  id="div-amount"
                  value={formAmount}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setFormAmount(e.target.value);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="div-notes" className="mb-2 block">
                  {t("notesOptional")}
                </Label>
                <Input
                  id="div-notes"
                  maxLength={500}
                  value={formNotes}
                  placeholder={t("notesPlaceholder")}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setFormNotes(e.target.value);
                  }}
                />
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !formIsin ||
                    !formDate
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t("saving")
                    : editing
                      ? t("saveUpdate")
                      : t("saveAdd")}
                </Button>
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
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {0 === dividends.length && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <Coins className="w-16 h-16 mx-auto mb-6 text-zinc-500 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-3">
              {t("emptyTitle")}
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              {t("emptyBody")}
            </p>
            <p className="text-sm text-zinc-500">
              {0 === companies.length
                ? t("emptyHintNoCompanies")
                : t("emptyHintAdd")}
            </p>
          </div>
        </div>
      )}

      {dividends.length > 0 && (
        <>
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-zinc-300 mb-2 block">
                  {t("filterYear")}
                </Label>
                <Select
                  value={resolvedFilterYear}
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-700 border-zinc-600 max-h-64">
                    <SelectItem value="all" className="font-semibold">
                      {t("allYearsCount", { count: dividends.length })}
                    </SelectItem>
                    {filterYearOptions.map((y) => (
                      <SelectItem
                        key={y}
                        value={String(y)}
                        className="cursor-pointer"
                      >
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-400" />
              {t("summary")}
            </h3>
            <div className="text-sm">
              <p className="text-zinc-400">
                {"all" === resolvedFilterYear
                  ? t("totalAllYears")
                  : t("totalForYear", { year: resolvedFilterYear })}
              </p>
              <p className="text-green-400 font-medium text-lg">
                {filteredTotal.toLocaleString(numberFormat, {
                  style: "currency",
                  currency: "RON",
                })}
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {t("entriesHeading")}
            </h3>
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-2 text-zinc-300">
                        {tc("instrument")}
                      </th>
                      <th className="text-left py-3 px-2 text-zinc-300">
                        {tc("isin")}
                      </th>
                      <th className="text-left py-3 px-2 text-zinc-300">
                        {tc("issuer")}
                      </th>
                      <th className="text-left py-3 px-2 text-zinc-300">
                        {tc("date")}
                      </th>
                      <th className="text-right py-3 px-2 text-zinc-300">
                        {t("colAmount")}
                      </th>
                      <th className="text-left py-3 px-2 text-zinc-300">
                        {t("colNotes")}
                      </th>
                      <th className="text-center py-3 px-2 text-zinc-300">
                        {tc("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row._id} className="border-b border-zinc-700/50">
                        <td className="py-3 px-2 text-white font-medium">
                          {row.instrument}
                        </td>
                        <td className="py-3 px-2 text-zinc-300">{row.isin}</td>
                        <td className="py-3 px-2 text-zinc-300">
                          {row.issuer}
                        </td>
                        <td className="py-3 px-2 text-white font-medium">
                          {formatDisplayDate(row.date)}
                        </td>
                        <td className="py-3 px-2 text-green-400 text-right font-medium">
                          {row.amount.toLocaleString(numberFormat, {
                            style: "currency",
                            currency: "RON",
                          })}
                        </td>
                        <td className="py-3 px-2 text-zinc-300 max-w-md truncate">
                          {row.notes ?? tc("emDash")}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                              onClick={() => {
                                openEdit(row);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
                              onClick={() => {
                                setDeleteTargetId(row._id!);
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
                <p>{t("noEntriesYear")}</p>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        title={t("deleteTitle")}
        open={deleteTargetId !== null}
        onConfirm={confirmDeleteDividend}
        description={t("deleteDescription")}
        isConfirming={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
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
