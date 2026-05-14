"use client";

import { useMemo, useState } from "react";
import { Edit, Plus, Trash2, Building2 } from "lucide-react";

import type {
  Company,
  PortfolioEntry,
  PortfolioSummary,
  PortfolioEntryWithCalculations,
} from "../../lib/types";

import { formatPrice } from "../../lib/utils";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
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
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "../../lib/hooks/use-companies";
import {
  usePortfolioEntries,
  useCreatePortfolioEntry,
  useDeletePortfolioEntry,
  useUpdatePortfolioEntry,
} from "../../lib/hooks/use-portfolio";

type PendingStockDelete =
  | { kind: "company"; id: string }
  | { kind: "portfolio"; id: string };

export default function StocksTab() {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: portfolioEntries = [], isLoading: portfolioLoading } =
    usePortfolioEntries();

  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const deleteCompanyMutation = useDeleteCompany();

  const createPortfolioMutation = useCreatePortfolioEntry();
  const updatePortfolioMutation = useUpdatePortfolioEntry();
  const deletePortfolioMutation = useDeletePortfolioEntry();

  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [showCompanies, setShowCompanies] = useState<boolean>(false);

  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    instrument: "",
    isin: "",
    issuer: "",
  });
  const [companyError, setCompanyError] = useState<string>("");

  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] =
    useState<PortfolioEntry | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    date: "",
    instrument: "",
    isin: "",
    issuer: "",
    quantity: "",
    locked: "",
    averagePrice: "",
    referencePrice: "",
  });
  const [portfolioError, setPortfolioError] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<PendingStockDelete | null>(
    null,
  );
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const availableDates = useMemo(() => {
    return [...new Set(portfolioEntries.map((entry) => entry.date))]
      .sort()
      .reverse();
  }, [portfolioEntries]);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError("");

    try {
      if (editingCompany) {
        await updateCompanyMutation.mutateAsync({
          ...editingCompany,
          ...companyForm,
        });
      } else {
        await createCompanyMutation.mutateAsync(companyForm);
      }

      resetCompanyForm();
      setIsCompanyDialogOpen(false);
    } catch (error) {
      setCompanyError(
        error instanceof Error ? error.message : "Failed to save company",
      );
    }
  };

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortfolioError("");

    try {
      const portfolioData = {
        date: portfolioForm.date,
        instrument: portfolioForm.instrument,
        isin: portfolioForm.isin,
        issuer: portfolioForm.issuer,
        quantity: parseFloat(portfolioForm.quantity),
        locked: parseFloat(portfolioForm.locked),
        averagePrice: parseFloat(portfolioForm.averagePrice),
        referencePrice: parseFloat(portfolioForm.referencePrice),
        currency: "RON" as const,
      };

      if (editingPortfolio) {
        await updatePortfolioMutation.mutateAsync({
          ...editingPortfolio,
          ...portfolioData,
        });
      } else {
        await createPortfolioMutation.mutateAsync(portfolioData);
      }

      if (!editingPortfolio && selectedDate !== "all") {
        setSelectedDate(portfolioForm.date);
      }

      resetPortfolioForm();
      setIsPortfolioDialogOpen(false);
    } catch (error) {
      setPortfolioError(
        error instanceof Error
          ? error.message
          : "Failed to save portfolio entry",
      );
    }
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    const kind = pendingDelete.kind;
    try {
      if ("company" === kind) {
        await deleteCompanyMutation.mutateAsync(pendingDelete.id);
      } else {
        await deletePortfolioMutation.mutateAsync(pendingDelete.id);
      }
      setPendingDelete(null);
    } catch (error) {
      console.error(error);
      setNoticeMessage(
        error instanceof Error
          ? error.message
          : "company" === kind
            ? "Failed to delete company"
            : "Failed to delete portfolio entry",
      );
      setPendingDelete(null);
    }
  };

  const deleteConfirmCopy =
    "company" === pendingDelete?.kind
      ? {
          title: "Delete company?",
          description: "Are you sure you want to delete this company?",
        }
      : "portfolio" === pendingDelete?.kind
        ? {
            title: "Delete portfolio entry?",
            description:
              "Are you sure you want to delete this portfolio entry?",
          }
        : { title: "", description: "" };

  const isStockDeleteConfirming =
    "company" === pendingDelete?.kind
      ? deleteCompanyMutation.isPending
      : "portfolio" === pendingDelete?.kind
        ? deletePortfolioMutation.isPending
        : false;
  const resetCompanyForm = () => {
    setCompanyForm({ instrument: "", isin: "", issuer: "" });
    setEditingCompany(null);
    setCompanyError("");
  };

  const resetPortfolioForm = () => {
    setPortfolioForm({
      date: portfolioForm.date,
      instrument: "",
      isin: "",
      issuer: "",
      quantity: "",
      locked: "0",
      averagePrice: "",
      referencePrice: "",
    });
    setEditingPortfolio(null);
    setPortfolioError("");
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      instrument: company.instrument,
      isin: company.isin,
      issuer: company.issuer,
    });
    setIsCompanyDialogOpen(true);
  };

  const openEditPortfolio = (entry: PortfolioEntry) => {
    setEditingPortfolio(entry);
    setPortfolioForm({
      date: entry.date,
      instrument: entry.instrument,
      isin: entry.isin,
      issuer: entry.issuer,
      quantity: entry.quantity.toString(),
      locked: entry.locked.toString(),
      averagePrice: entry.averagePrice.toString(),
      referencePrice: entry.referencePrice.toString(),
    });
    setIsPortfolioDialogOpen(true);
  };

  const handleCompanySelect = (instrument: string) => {
    const company = companies.find((c) => c.instrument === instrument);
    if (company) {
      setPortfolioForm((prev) => ({
        ...prev,
        instrument: company.instrument,
        isin: company.isin,
        issuer: company.issuer,
      }));
    }
  };

  const renderPortfolioTable = (date: string) => {
    const dateEntries = portfolioEntries.filter((entry) => entry.date === date);
    const dateEntriesWithCalculations: PortfolioEntryWithCalculations[] =
      dateEntries.map((entry) => {
        const purchaseValue = entry.quantity * entry.averagePrice;
        const currentValue = entry.quantity * entry.referencePrice;
        const profit = currentValue - purchaseValue;
        const profitPercent =
          purchaseValue > 0 ? (profit / purchaseValue) * 100 : 0;

        return {
          ...entry,
          purchaseValue,
          currentValue,
          profit,
          profitPercent,
        };
      });

    const dateSummary: PortfolioSummary = dateEntriesWithCalculations.reduce(
      (acc, entry) => ({
        totalPurchaseValue: acc.totalPurchaseValue + entry.purchaseValue,
        totalCurrentValue: acc.totalCurrentValue + entry.currentValue,
        totalProfit: acc.totalProfit + entry.profit,
        totalProfitPercent: 0,
      }),
      {
        totalPurchaseValue: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
      },
    );

    dateSummary.totalProfitPercent =
      dateSummary.totalPurchaseValue > 0
        ? (dateSummary.totalProfit / dateSummary.totalPurchaseValue) * 100
        : 0;

    return (
      <div
        key={date}
        className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 mb-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          Portfolio Status - {new Date(date).toLocaleDateString()}
        </h3>

        {dateEntriesWithCalculations.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-3 px-2 text-zinc-300">
                      Instrument
                    </th>
                    <th className="text-left py-3 px-2 text-zinc-300">ISIN</th>
                    <th className="text-left py-3 px-2 text-zinc-300">
                      Issuer
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Locked
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Avg Price
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Ref Price
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Purchase Value
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Current Value
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Profit
                    </th>
                    <th className="text-right py-3 px-2 text-zinc-300">
                      Profit %
                    </th>
                    <th className="text-center py-3 px-2 text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dateEntriesWithCalculations.map((entry) => (
                    <tr key={entry._id} className="border-b border-zinc-700/50">
                      <td className="py-3 px-2 text-white font-medium">
                        {entry.instrument}
                      </td>
                      <td className="py-3 px-2 text-zinc-300">{entry.isin}</td>
                      <td className="py-3 px-2 text-zinc-300">
                        {entry.issuer}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {entry.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {entry.locked.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {formatPrice(entry.averagePrice)}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {formatPrice(entry.referencePrice)}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {entry.purchaseValue.toLocaleString("ro-RO", {
                          style: "currency",
                          currency: "RON",
                        })}
                      </td>
                      <td className="py-3 px-2 text-white text-right">
                        {entry.currentValue.toLocaleString("ro-RO", {
                          style: "currency",
                          currency: "RON",
                        })}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-medium ${
                          entry.profit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {entry.profit.toLocaleString("ro-RO", {
                          style: "currency",
                          currency: "RON",
                        })}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-medium ${
                          entry.profitPercent >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {entry.profitPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                            onClick={() => {
                              openEditPortfolio(entry);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletePortfolioMutation.isPending}
                            className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
                            onClick={() => {
                              setPendingDelete({
                                kind: "portfolio",
                                id: entry._id!,
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

            {/* Summary */}
            <div className="mt-6 p-4 bg-zinc-700/30 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Total Purchase Value</p>
                  <p className="text-white font-medium">
                    {dateSummary.totalPurchaseValue.toLocaleString("ro-RO", {
                      style: "currency",
                      currency: "RON",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">Total Current Value</p>
                  <p className="text-white font-medium">
                    {dateSummary.totalCurrentValue.toLocaleString("ro-RO", {
                      style: "currency",
                      currency: "RON",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">Total Profit</p>
                  <p
                    className={`font-medium ${
                      dateSummary.totalProfit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {dateSummary.totalProfit.toLocaleString("ro-RO", {
                      style: "currency",
                      currency: "RON",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">Total Profit %</p>
                  <p
                    className={`font-medium ${
                      dateSummary.totalProfitPercent >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {dateSummary.totalProfitPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-zinc-400 text-center py-8">
            <p>No portfolio entries found for this date.</p>
            <p className="text-sm">
              Add your first portfolio entry using the &quot;Add Portfolio
              Status&quot; button above.
            </p>
          </div>
        )}
      </div>
    );
  };

  if (companiesLoading || portfolioLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-zinc-400">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4">
        <Dialog
          open={isCompanyDialogOpen}
          onOpenChange={setIsCompanyDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              onClick={resetCompanyForm}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Companies
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handleCompanySubmit(e);
              }}
            >
              <div>
                <Label htmlFor="instrument" className="mb-2 block">
                  Instrument
                </Label>
                <Input
                  required
                  id="instrument"
                  maxLength={100}
                  value={companyForm.instrument}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setCompanyForm((prev) => ({
                      ...prev,
                      instrument: e.target.value,
                    }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="isin" className="mb-2 block">
                  ISIN
                </Label>
                <Input
                  required
                  id="isin"
                  value={companyForm.isin}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setCompanyForm((prev) => ({
                      ...prev,
                      isin: e.target.value,
                    }));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="issuer" className="mb-2 block">
                  Issuer
                </Label>
                <Input
                  required
                  id="issuer"
                  value={companyForm.issuer}
                  className="bg-zinc-700 border-zinc-600 text-white"
                  onChange={(e) => {
                    setCompanyForm((prev) => ({
                      ...prev,
                      issuer: e.target.value,
                    }));
                  }}
                />
              </div>

              {companyError && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                  {companyError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  disabled={
                    createCompanyMutation.isPending ||
                    updateCompanyMutation.isPending
                  }
                >
                  {createCompanyMutation.isPending ||
                  updateCompanyMutation.isPending
                    ? "Saving..."
                    : editingCompany
                      ? "Update"
                      : "Add"}{" "}
                  Company
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setIsCompanyDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isPortfolioDialogOpen}
          onOpenChange={setIsPortfolioDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              onClick={resetPortfolioForm}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Portfolio Status
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPortfolio
                  ? "Edit Portfolio Entry"
                  : "Add New Portfolio Entry"}
              </DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void handlePortfolioSubmit(e);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="mb-2 block">
                    Date
                  </Label>
                  <Input
                    required
                    id="date"
                    type="date"
                    value={portfolioForm.date}
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    onChange={(e) => {
                      setPortfolioForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="company" className="mb-2 block">
                    Company
                  </Label>
                  <Select onValueChange={handleCompanySelect}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white cursor-pointer w-full">
                      <SelectValue
                        className="truncate"
                        placeholder="Select company"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-700 border-zinc-600 min-w-[200px] max-w-[400px]">
                      {companies.length > 0 ? (
                        companies.map((company) => (
                          <SelectItem
                            key={company._id}
                            value={company.instrument}
                            className="truncate pr-8 cursor-pointer"
                          >
                            <span className="truncate block max-w-full">
                              {company.instrument} - {company.issuer}
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-zinc-400">
                          No companies available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="mb-2 block">
                    Quantity
                  </Label>
                  <Input
                    min="0"
                    required
                    step="0.01"
                    id="quantity"
                    type="number"
                    max="1000000000"
                    value={portfolioForm.quantity}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setPortfolioForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="locked" className="mb-2 block">
                    Locked
                  </Label>
                  <Input
                    min="0"
                    required
                    id="locked"
                    step="0.01"
                    type="number"
                    placeholder="0"
                    max="1000000000"
                    value={portfolioForm.locked}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setPortfolioForm((prev) => ({
                        ...prev,
                        locked: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block" htmlFor="averagePrice">
                    Average Price
                  </Label>
                  <Input
                    required
                    min="0.001"
                    step="0.001"
                    max="1000000"
                    type="number"
                    id="averagePrice"
                    value={portfolioForm.averagePrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setPortfolioForm((prev) => ({
                        ...prev,
                        averagePrice: e.target.value,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="mb-2 block" htmlFor="referencePrice">
                    Reference Price
                  </Label>
                  <Input
                    required
                    min="0.001"
                    step="0.001"
                    max="1000000"
                    type="number"
                    id="referencePrice"
                    value={portfolioForm.referencePrice}
                    className="bg-zinc-700 border-zinc-600 text-white"
                    onChange={(e) => {
                      setPortfolioForm((prev) => ({
                        ...prev,
                        referencePrice: e.target.value,
                      }));
                    }}
                  />
                </div>
              </div>

              {portfolioError && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                  {portfolioError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  disabled={
                    createPortfolioMutation.isPending ||
                    updatePortfolioMutation.isPending
                  }
                >
                  {createPortfolioMutation.isPending ||
                  updatePortfolioMutation.isPending
                    ? "Saving..."
                    : editingPortfolio
                      ? "Update"
                      : "Add"}{" "}
                  Entry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => {
                    setIsPortfolioDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* No Data Message */}
      {0 === companies.length &&
        0 === portfolioEntries.length &&
        !showCompanies && (
          <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-12">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-6 text-zinc-500 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-3">
                Welcome to Finance Manager
              </h3>
              <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                Get started by adding your first company and portfolio entries
                to track your investments.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <p className="text-sm text-zinc-500">
                  Use the buttons above to add companies and portfolio data
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Date Selector and Companies Toggle */}
      {(companies.length > 0 || portfolioEntries.length > 0) && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            {availableDates.length > 0 ? (
              <div className="flex-1">
                <Label htmlFor="date-select" className="text-white font-medium">
                  Select Portfolio Date:
                </Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white mt-2 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-700 border-zinc-600">
                    <SelectItem value="all" className="font-semibold">
                      📅 All Dates
                    </SelectItem>
                    {availableDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-zinc-400 text-sm">
                  No portfolio entries yet.
                </p>
              </div>
            )}

            {companies.length > 0 && (
              <div className="ml-6 flex items-end">
                <Button
                  size="sm"
                  variant={showCompanies ? "outline" : "default"}
                  onClick={() => {
                    setShowCompanies(!showCompanies);
                  }}
                  className={`cursor-pointer ${
                    showCompanies
                      ? "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {showCompanies ? "👁️ Hide Companies" : "👁️ Show Companies"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Companies Management */}
      {showCompanies && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Companies</h3>
          {companies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-3 px-2 text-zinc-300">
                      Instrument
                    </th>
                    <th className="text-left py-3 px-2 text-zinc-300">ISIN</th>
                    <th className="text-left py-3 px-2 text-zinc-300">
                      Issuer
                    </th>
                    <th className="text-center py-3 px-2 text-zinc-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr
                      key={company._id}
                      className="border-b border-zinc-700/50"
                    >
                      <td className="py-3 px-2 text-white font-medium">
                        {company.instrument}
                      </td>
                      <td className="py-3 px-2 text-zinc-300">
                        {company.isin}
                      </td>
                      <td className="py-3 px-2 text-zinc-300">
                        {company.issuer}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                            onClick={() => {
                              openEditCompany(company);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deleteCompanyMutation.isPending}
                            className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
                            onClick={() => {
                              setPendingDelete({
                                kind: "company",
                                id: company._id!,
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
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No companies found.</p>
              <p className="text-sm">
                Add your first company using the &quot;Add Companies&quot;
                button above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Tables */}
      {selectedDate &&
        ("all" === selectedDate
          ? availableDates.map((date) => renderPortfolioTable(date))
          : renderPortfolioTable(selectedDate))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={deleteConfirmCopy.title}
        onConfirm={confirmPendingDelete}
        isConfirming={isStockDeleteConfirming}
        description={deleteConfirmCopy.description}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
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
