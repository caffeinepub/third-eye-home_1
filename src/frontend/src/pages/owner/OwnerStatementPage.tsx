import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR } from "../../utils/format";
import { numberToWords } from "../../utils/numberToWords";

interface Props {
  ownerId: bigint;
  ownerName?: string;
  flatNo?: string;
  blockNo?: string;
  phone?: string;
}

type FilterPreset = "all" | "last-month" | "last-365" | "custom";

function getEntryDateMs(entryDate: bigint | string): number {
  if (typeof entryDate === "string") return new Date(entryDate).getTime();
  return Number(entryDate) / 1_000_000;
}

export default function OwnerStatementPage({
  ownerId,
  ownerName,
  flatNo,
  blockNo,
  phone,
}: Props) {
  const { actor, isFetching } = useActor();
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filter state
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getFlatStatement(ownerId)
      .then(setStatement)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [actor, isFetching, ownerId]);

  // Apply date filter
  const filteredStatement = useMemo(() => {
    const now = Date.now();
    return statement.filter((t) => {
      const ms = getEntryDateMs(t.entryDate);
      if (filterPreset === "last-month") {
        return ms >= now - 30 * 24 * 60 * 60 * 1000;
      }
      if (filterPreset === "last-365") {
        return ms >= now - 365 * 24 * 60 * 60 * 1000;
      }
      if (filterPreset === "custom") {
        const from = dateFrom ? new Date(dateFrom).getTime() : 0;
        const to = dateTo
          ? new Date(dateTo).getTime() + 86400000
          : Number.POSITIVE_INFINITY;
        return ms >= from && ms <= to;
      }
      return true;
    });
  }, [statement, filterPreset, dateFrom, dateTo]);

  // Oldest first, newest last — proper Tally ledger order
  const chronological = [...filteredStatement].reverse();
  const rows = chronological.map((t, i) => {
    const runningBalance = chronological.slice(0, i + 1).reduce((acc, tx) => {
      return tx.transactionType === TransactionType.Debit
        ? acc + Number(tx.amount)
        : acc - Number(tx.amount);
    }, 0);
    return { ...t, runningBalance };
  });

  const totalDebit = filteredStatement
    .filter((t) => t.transactionType === TransactionType.Debit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const totalCredit = filteredStatement
    .filter((t) => t.transactionType === TransactionType.Credit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const pendingBalance =
    rows.length > 0 ? rows[rows.length - 1].runningBalance : 0;

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = `Statement_${blockNo}-${flatNo}_${new Date().toLocaleDateString("en-IN")}`;
    window.print();
    document.title = originalTitle;
  };

  const presetLabel: Record<FilterPreset, string> = {
    all: "All Time",
    "last-month": "Last Month",
    "last-365": "Last 365 Days",
    custom: "Custom Range",
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #tally-owner-statement, #tally-owner-statement * { visibility: visible !important; }
          #tally-owner-statement { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Filter + Action bar */}
        <div className="bg-card rounded-xl border border-border p-4 no-print space-y-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-semibold mr-1">
              Duration:
            </span>
            {(
              ["all", "last-month", "last-365", "custom"] as FilterPreset[]
            ).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filterPreset === p
                    ? "bg-primary text-white shadow"
                    : "border border-border bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {presetLabel[p]}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {filterPreset === "custom" && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="owner-from"
                  className="text-xs text-muted-foreground"
                >
                  From:
                </label>
                <input
                  id="owner-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="owner-to"
                  className="text-xs text-muted-foreground"
                >
                  To:
                </label>
                <input
                  id="owner-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-9 text-sm gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="h-9 text-sm gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div
            data-ocid="owner.statement.loading_state"
            className="p-8 text-center"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div
            id="tally-owner-statement"
            className="bg-white border border-gray-300 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="border-b border-gray-300 p-5 text-center">
              <h1 className="text-xl font-bold uppercase tracking-wide text-gray-800">
                THIRD EYE HOME
              </h1>
              <p className="text-sm text-gray-500">
                Society Maintenance Statement
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-8 text-sm text-left max-w-lg mx-auto">
                <div>
                  <span className="text-gray-500">Flat No:</span>{" "}
                  <span className="font-semibold">
                    {blockNo}-{flatNo}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Owner:</span>{" "}
                  <span className="font-semibold">{ownerName}</span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-500">Print Date:</span>{" "}
                  <span className="font-semibold">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-500">Period:</span>{" "}
                  <span className="font-semibold">
                    {filterPreset === "all" && "All Time"}
                    {filterPreset === "last-month" && "Last 30 Days"}
                    {filterPreset === "last-365" && "Last 365 Days"}
                    {filterPreset === "custom" &&
                      `${dateFrom || "—"} to ${dateTo || "—"}`}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-500">Contact:</span>{" "}
                  <span className="font-semibold">{phone || "—"}</span>
                </div>
              </div>
            </div>

            {filteredStatement.length === 0 ? (
              <div
                data-ocid="owner.statement.empty_state"
                className="p-8 text-center text-sm text-gray-500"
              >
                No transactions found for the selected period.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border border-gray-600 px-3 py-2 text-left font-semibold w-8">
                          #
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                          Date
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                          Particulars / Description
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-left font-semibold">
                          Vch Type
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                          Debit (₹)
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                          Credit (₹)
                        </th>
                        <th className="border border-gray-600 px-3 py-2 text-right font-semibold">
                          Balance Due (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t, i) => {
                        const isDebit =
                          t.transactionType === TransactionType.Debit;
                        return (
                          <tr
                            key={t.id.toString()}
                            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            data-ocid={`owner.statement.item.${i + 1}`}
                          >
                            <td className="border border-gray-200 px-3 py-2 text-gray-500">
                              {i + 1}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-nowrap">
                              {formatDate(t.entryDate)}
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              {t.description}
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  isDebit
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {isDebit ? "Debit Note" : "Receipt"}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                              {isDebit ? (
                                <span className="text-red-600 font-medium">
                                  {Number(t.amount).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                              {!isDebit ? (
                                <span className="text-green-600 font-medium">
                                  {Number(t.amount).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-right font-mono">
                              <span
                                className={
                                  t.runningBalance > 0
                                    ? "text-red-600 font-semibold"
                                    : "text-green-600 font-semibold"
                                }
                              >
                                {t.runningBalance.toLocaleString("en-IN")}
                                {t.runningBalance > 0 ? " Dr" : " Cr"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr className="bg-gray-100 font-bold">
                        <td
                          colSpan={4}
                          className="border border-gray-300 px-3 py-2 text-right text-gray-700 uppercase text-xs tracking-wide"
                        >
                          Totals
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono text-red-700">
                          {totalDebit.toLocaleString("en-IN")}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono text-green-700">
                          {totalCredit.toLocaleString("en-IN")}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                          <span
                            className={
                              pendingBalance > 0
                                ? "text-red-700"
                                : "text-green-700"
                            }
                          >
                            {Math.abs(pendingBalance).toLocaleString("en-IN")}
                            {pendingBalance > 0 ? " Dr" : " Cr"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Balance in words */}
                <div className="border-t border-gray-300 bg-gray-50 px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Closing Balance Due
                      </p>
                      <p
                        className="text-2xl font-bold mt-0.5"
                        style={{
                          color: pendingBalance > 0 ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {formatINR(Math.abs(pendingBalance))}
                        <span className="text-base font-semibold ml-2">
                          {pendingBalance > 0 ? "(Dr)" : "(Cr)"}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Amount in Words
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5 max-w-xs sm:text-right">
                        {numberToWords(Math.abs(pendingBalance))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-300 px-5 py-3 flex justify-between text-xs text-gray-400">
                  <span>Generated by Third Eye Home</span>
                  <span>{new Date().toLocaleString("en-IN")}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
