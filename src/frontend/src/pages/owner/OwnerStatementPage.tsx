import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getFlatStatement(ownerId)
      .then(setStatement)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [actor, isFetching, ownerId]);

  // Oldest first, newest last — proper Tally ledger order
  const chronological = [...statement].reverse();
  const rows = chronological.map((t, i) => {
    const runningBalance = chronological.slice(0, i + 1).reduce((acc, tx) => {
      return tx.transactionType === TransactionType.Debit
        ? acc + Number(tx.amount)
        : acc - Number(tx.amount);
    }, 0);
    return { ...t, runningBalance };
  });

  const totalDebit = statement
    .filter((t) => t.transactionType === TransactionType.Debit)
    .reduce((a, t) => a + Number(t.amount), 0);
  const totalCredit = statement
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
        {/* Action bar */}
        <div className="flex justify-end gap-2 no-print">
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
                  <span className="text-gray-500">Contact:</span>{" "}
                  <span className="font-semibold">{phone || "—"}</span>
                </div>
              </div>
            </div>

            {statement.length === 0 ? (
              <div
                data-ocid="owner.statement.empty_state"
                className="p-8 text-center text-sm text-gray-500"
              >
                No transactions found.
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
