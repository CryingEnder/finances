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

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

function yearRangeInclusive(end: number): number[] {
  const out: number[] = [];
  for (let y = MIN_YEAR; y <= end; y += 1) {
    out.push(y);
  }
  return out;
}

/** Prefer current calendar year when it appears in `available`; otherwise latest year in the list. */
function defaultYearFromAvailable(
  available: number[],
  calendarYear: number,
): string {
  if (0 === available.length) {
    return "";
  }
  if (available.includes(calendarYear)) {
    return String(calendarYear);
  }
  return String(available[available.length - 1]);
}

export default function DividendsTab() {
  const t = useTranslations("Dividends");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const nf = numberFormatLocale(locale);

  const { data: dividends = [], isLoading } = useDividends();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createMutation = useCreateDividend();
  const updateMutation = useUpdateDividend();
  const deleteMutation = useDeleteDividend();

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dividend | null>(null);
  const [formIsin, setFormIsin] = useState<string>("");
  const [formYear, setFormYear] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const currentCalendarYear = new Date().getFullYear();
  const maxPickerYear = Math.min(MAX_YEAR, currentCalendarYear + 1);

  const pickerYears = useMemo(
    () => yearRangeInclusive(maxPickerYear),
    [maxPickerYear],
  );

  const filterYearOptions = useMemo(() => {
    const years = [...new Set(dividends.map((d) => d.year))].sort(
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
    return dividends.filter((d) => d.year === y);
  }, [dividends, resolvedFilterYear]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, d) => sum + d.amount, 0),
    [filtered],
  );

  const beginAddDividend = () => {
    setEditing(null);
    setFormError("");
    setFormIsin("");
    const allYears = yearRangeInclusive(maxPickerYear);
    setFormYear(defaultYearFromAvailable(allYears, currentCalendarYear));
    setFormAmount("");
    setFormNotes("");
  };

  const openEdit = (row: Dividend) => {
    setEditing(row);
    setFormIsin(row.isin);
    setFormYear(String(row.year));
    setFormAmount(String(row.amount));
    setFormNotes(row.notes ?? "");
    setFormError("");
    setDialogOpen(true);
  };

  const handleCompanySelect = (isin: string) => {
    setFormIsin(isin);
    setFormError("");
    const currentY = parseInt(formYear, 10);
    if (!Number.isNaN(currentY) && pickerYears.includes(currentY)) {
      return;
    }
    setFormYear(defaultYearFromAvailable(pickerYears, currentCalendarYear));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const year = parseInt(formYear, 10);
    const amount = parseFloat(formAmount);

    try {
      if (Number.isNaN(year) || Number.isNaN(amount)) {
        setFormError(t("errYearAmount"));
        return;
      }

      const company = companies.find((c) => c.isin === formIsin);
      if (!company) {
        setFormError(t("errSelectCompany"));
        return;
      }

      if (!pickerYears.includes(year)) {
        setFormError(t("errYearRange"));
        return;
      }

      const payload: Omit<Dividend, "_id"> = {
        instrument: company.instrument,
        isin: company.isin,
        issuer: company.issuer,
        year,
        amount,
        ...(formNotes.trim().length > 0 ? { notes: formNotes.trim() } : {}),
      };

      if (editing) {
        await updateMutation.mutateAsync({ ...editing, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setEditing(null);
      setFormIsin("");
      setFormYear("");
      setFormAmount("");
      setFormNotes("");
      setFormError("");
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("failedSave"));
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
      setNoticeMessage(err instanceof Error ? err.message : t("failedDelete"));
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
                <Select value={formIsin} onValueChange={handleCompanySelect}>
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
                <Label htmlFor="div-year" className="mb-2 block">
                  {t("year")}
                </Label>
                <Select value={formYear} onValueChange={setFormYear}>
                  <SelectTrigger
                    id="div-year"
                    className="bg-zinc-700 border-zinc-600 text-white cursor-pointer"
                  >
                    <SelectValue placeholder={tc("selectYear")} />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-700 border-zinc-600 max-h-64">
                    {pickerYears.map((y) => (
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
                    !formIsin
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
                {filteredTotal.toLocaleString(nf, {
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
                        {t("colYear")}
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
                          {row.year}
                        </td>
                        <td className="py-3 px-2 text-green-400 text-right font-medium">
                          {row.amount.toLocaleString(nf, {
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
