"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { formatPrice } from "../../lib/utils";
import type {
  Company,
  PortfolioEntry,
  PortfolioEntryWithCalculations,
  PortfolioSummary,
} from "../../lib/types";

export default function StocksTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>(
    []
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showCompanies, setShowCompanies] = useState<boolean>(false);

  // Company management states
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    instrument: "",
    isin: "",
    issuer: "",
  });

  // Portfolio management states
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

  // Load data on component mount
  useEffect(() => {
    loadCompanies();
    loadPortfolioEntries();
  }, []);

  // Update available dates when portfolio entries change
  useEffect(() => {
    const dates = [...new Set(portfolioEntries.map((entry) => entry.date))]
      .sort()
      .reverse();
    setAvailableDates(dates);
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate("all");
    }
  }, [portfolioEntries, selectedDate]);

  const loadCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded companies:", data);
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const loadPortfolioEntries = async () => {
    try {
      const response = await fetch("/api/portfolio");
      if (response.ok) {
        const data = await response.json();
        setPortfolioEntries(data);
      }
    } catch (error) {
      console.error("Error loading portfolio entries:", error);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCompany
        ? `/api/companies/${editingCompany._id}`
        : "/api/companies";
      const method = editingCompany ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });

      if (response.ok) {
        await loadCompanies();
        resetCompanyForm();
        setIsCompanyDialogOpen(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save company");
      }
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Failed to save company");
    }
  };

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPortfolio
        ? `/api/portfolio/${editingPortfolio._id}`
        : "/api/portfolio";
      const method = editingPortfolio ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portfolioForm),
      });

      if (response.ok) {
        await loadPortfolioEntries();
        resetPortfolioForm();
        setIsPortfolioDialogOpen(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save portfolio entry");
      }
    } catch (error) {
      console.error("Error saving portfolio entry:", error);
      alert("Failed to save portfolio entry");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    console.log("Deleting company with ID:", id);
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadCompanies();
      } else {
        const error = await response.json();
        console.error("Delete error:", error);
        alert(error.error || "Failed to delete company");
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Failed to delete company");
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio entry?"))
      return;

    try {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadPortfolioEntries();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete portfolio entry");
      }
    } catch (error) {
      console.error("Error deleting portfolio entry:", error);
      alert("Failed to delete portfolio entry");
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({ instrument: "", isin: "", issuer: "" });
    setEditingCompany(null);
  };

  const resetPortfolioForm = () => {
    setPortfolioForm({
      date: "",
      instrument: "",
      isin: "",
      issuer: "",
      quantity: "",
      locked: "0",
      averagePrice: "",
      referencePrice: "",
    });
    setEditingPortfolio(null);
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

  // Calculate portfolio data for selected date
  const currentDateEntries = portfolioEntries.filter(
    (entry) => entry.date === selectedDate
  );

  const entriesWithCalculations: PortfolioEntryWithCalculations[] =
    currentDateEntries.map((entry) => {
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

  const summary: PortfolioSummary = entriesWithCalculations.reduce(
    (acc, entry) => ({
      totalPurchaseValue: acc.totalPurchaseValue + entry.purchaseValue,
      totalCurrentValue: acc.totalCurrentValue + entry.currentValue,
      totalProfit: acc.totalProfit + entry.profit,
      totalProfitPercent: 0, // Will calculate after
    }),
    {
      totalPurchaseValue: 0,
      totalCurrentValue: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
    }
  );

  summary.totalProfitPercent =
    summary.totalPurchaseValue > 0
      ? (summary.totalProfit / summary.totalPurchaseValue) * 100
      : 0;

  // Function to render portfolio table for a specific date
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
        totalProfitPercent: 0, // Will be calculated after
      }),
      {
        totalPurchaseValue: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
      }
    );

    // Calculate total profit percentage
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
                            onClick={() => openEditPortfolio(entry)}
                            className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePortfolio(entry._id!)}
                            className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
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
              <h4 className="text-md font-semibold text-white mb-3">
                Summary for {new Date(date).toLocaleDateString()}
              </h4>
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
              Add your first portfolio entry using the "Add Portfolio Status"
              button above.
            </p>
          </div>
        )}
      </div>
    );
  };

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
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <Label htmlFor="instrument" className="mb-2 block">
                  Instrument
                </Label>
                <Input
                  id="instrument"
                  value={companyForm.instrument}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      instrument: e.target.value,
                    }))
                  }
                  className="bg-zinc-700 border-zinc-600 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="isin" className="mb-2 block">
                  ISIN
                </Label>
                <Input
                  id="isin"
                  value={companyForm.isin}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      isin: e.target.value,
                    }))
                  }
                  className="bg-zinc-700 border-zinc-600 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="issuer" className="mb-2 block">
                  Issuer
                </Label>
                <Input
                  id="issuer"
                  value={companyForm.issuer}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      issuer: e.target.value,
                    }))
                  }
                  className="bg-zinc-700 border-zinc-600 text-white"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  {editingCompany ? "Update" : "Add"} Company
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCompanyDialogOpen(false)}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
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
            <form onSubmit={handlePortfolioSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="mb-2 block">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={portfolioForm.date}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="bg-zinc-700 border-zinc-600 text-white [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="company" className="mb-2 block">
                    Company
                  </Label>
                  <Select onValueChange={handleCompanySelect}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white cursor-pointer w-full">
                      <SelectValue
                        placeholder="Select company"
                        className="truncate"
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
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={portfolioForm.quantity}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    className="bg-zinc-700 border-zinc-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="locked" className="mb-2 block">
                    Locked
                  </Label>
                  <Input
                    id="locked"
                    type="number"
                    step="0.01"
                    value={portfolioForm.locked}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        locked: e.target.value,
                      }))
                    }
                    className="bg-zinc-700 border-zinc-600 text-white"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="averagePrice" className="mb-2 block">
                    Average Price
                  </Label>
                  <Input
                    id="averagePrice"
                    type="number"
                    step="0.01"
                    value={portfolioForm.averagePrice}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        averagePrice: e.target.value,
                      }))
                    }
                    className="bg-zinc-700 border-zinc-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="referencePrice" className="mb-2 block">
                    Reference Price
                  </Label>
                  <Input
                    id="referencePrice"
                    type="number"
                    step="0.01"
                    value={portfolioForm.referencePrice}
                    onChange={(e) =>
                      setPortfolioForm((prev) => ({
                        ...prev,
                        referencePrice: e.target.value,
                      }))
                    }
                    className="bg-zinc-700 border-zinc-600 text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  {editingPortfolio ? "Update" : "Add"} Entry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPortfolioDialogOpen(false)}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Selector and Companies Toggle */}
      {availableDates.length > 0 && (
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
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

            <div className="ml-6 flex items-end">
              <Button
                variant={showCompanies ? "outline" : "default"}
                size="sm"
                onClick={() => setShowCompanies(!showCompanies)}
                className={`cursor-pointer ${
                  showCompanies
                    ? "border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {showCompanies ? "👁️ Hide Companies" : "👁️ Show Companies"}
              </Button>
            </div>
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
                            onClick={() => openEditCompany(company)}
                            className="h-8 w-8 p-0 border-zinc-600 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCompany(company._id!)}
                            className="h-8 w-8 p-0 border-zinc-600 text-red-400 hover:bg-red-900/20 cursor-pointer"
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
                Add your first company using the "Add Companies" button above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Tables */}
      {selectedDate && (
        <>
          {selectedDate === "all"
            ? // Render all dates as separate tables
              availableDates.map((date) => renderPortfolioTable(date))
            : // Render single date table
              renderPortfolioTable(selectedDate)}
        </>
      )}
    </div>
  );
}
