import { Button } from "@/components/ui/button";
import { Download, Printer, Receipt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FlatOwnerPublic, Transaction } from "../../backend.d";
import { TransactionType } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import { formatDate, formatINR } from "../../utils/format";
import { numberToWords } from "../../utils/numberToWords";

interface Props {
  ownerProfile: FlatOwnerPublic;
}

function generateReceiptHTML(t: Transaction, owner: FlatOwnerPublic): string {
  const receiptNo = `RCP-${String(Number(t.id)).padStart(5, "0")}`;
  const amountNum = Number(t.amount);
  const amountWords = numberToWords(amountNum);
  const dateStr = formatDate(t.entryDate);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${receiptNo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #111; }
    .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a2e; color: white; padding: 20px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #aaa; }
    .receipt-no { background: #f5f5f5; border-bottom: 1px solid #ddd; padding: 10px 24px; display: flex; justify-content: space-between; font-size: 13px; }
    .body { padding: 20px 24px; }
    .section { margin-bottom: 16px; }
    .section label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .section .value { font-size: 14px; font-weight: 600; color: #111; margin-top: 2px; }
    .amount-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 20px 0; }
    .amount-box .amt { font-size: 32px; font-weight: 800; color: #16a34a; }
    .amount-box .words { font-size: 13px; color: #444; margin-top: 4px; font-style: italic; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .thanks { text-align: center; padding: 16px; background: #fafafa; border-top: 1px solid #eee; font-size: 13px; color: #555; }
    .sig { display: flex; justify-content: flex-end; padding: 16px 24px 20px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #333; width: 180px; margin: 0 auto 4px; }
    .sig-label { font-size: 11px; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>THIRD EYE HOME</h1>
    <p>Payment Receipt</p>
  </div>
  <div class="receipt-no">
    <span><strong>Receipt No:</strong> ${receiptNo}</span>
    <span><strong>Date:</strong> ${dateStr}</span>
  </div>
  <div class="body">
    <div class="section">
      <label>Flat Details</label>
      <div class="grid2">
        <div class="value">Flat: ${owner.blockNo}-${owner.flatNo}</div>
        <div class="value">Owner: ${owner.ownerName}</div>
      </div>
    </div>
    <div class="amount-box">
      <div class="amt">&#8377;${amountNum.toLocaleString("en-IN")}</div>
      <div class="words">${amountWords} Only</div>
    </div>
    <div class="section">
      <label>Description / Payment Category</label>
      <div class="value">${t.description}</div>
    </div>
  </div>
  <div class="thanks">Received with thanks</div>
  <div class="sig">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signatory</div>
    </div>
  </div>
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;
}

export default function OwnerReceiptsPage({ ownerProfile }: Props) {
  const { actor, isFetching } = useActor();
  const [statement, setStatement] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    actor
      .getOwnerStatement(ownerProfile.id)
      .then(setStatement)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [actor, isFetching, ownerProfile.id]);

  const receipts = useMemo(
    () =>
      [...statement]
        .filter((t) => t.transactionType === TransactionType.Credit)
        .sort((a, b) => Number(b.entryDate) - Number(a.entryDate)),
    [statement],
  );

  const totalReceived = receipts.reduce((s, t) => s + Number(t.amount), 0);

  const openReceipt = (t: Transaction) => {
    const html = generateReceiptHTML(t, ownerProfile);
    const w = window.open("", "_blank", "width=700,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Your Receipts</h2>
            <p className="text-xs text-muted-foreground">
              All payment receipts for your account
            </p>
          </div>
        </div>
        {receipts.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Total Received: </span>
              {formatINR(totalReceived)}
              <span className="ml-2 text-xs text-green-600">
                ({receipts.length} receipt{receipts.length !== 1 ? "s" : ""})
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div
          data-ocid="owner.receipts.loading_state"
          className="bg-card rounded-xl border border-border p-12 text-center"
        >
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </div>
      ) : receipts.length === 0 ? (
        <div
          data-ocid="owner.receipts.empty_state"
          className="bg-card rounded-xl border border-border shadow-card p-12 text-center"
        >
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            No payment receipts found. Receipts will appear here after payments
            are recorded.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-3 text-left font-semibold">
                    Receipt No
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((t, i) => (
                  <tr
                    key={t.id.toString()}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    data-ocid={`owner.receipts.item.${i + 1}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-green-700">
                      RCP-{String(Number(t.id)).padStart(5, "0")}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {formatDate(t.entryDate)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">
                      {formatINR(Number(t.amount))}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {t.description}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReceipt(t)}
                          className="h-7 px-2 gap-1 text-xs"
                          data-ocid={`owner.receipts.print.${i + 1}`}
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReceipt(t)}
                          className="h-7 px-2 gap-1 text-xs"
                          data-ocid={`owner.receipts.download.${i + 1}`}
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
