import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { useAssets } from "@/hooks/useAssets";
import type { Transaction, TxType } from "@/types";
import { Plus } from "lucide-react";

interface Props {
  assetId?: string;
  transaction?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function tsToDateStr(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: string, month: string): number {
  if (!year || !month) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

export function AddTransactionDialog({ assetId, transaction, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!transaction;
  const effectiveAssetId = assetId ?? transaction?.asset_id ?? "";

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [txType, setTxType] = useState<TxType>(transaction?.tx_type ?? "buy");
  const [inputMode, setInputMode] = useState<"quantity" | "total" | "conversion">("quantity");
  const [quantity, setQuantity] = useState(transaction ? String(transaction.quantity) : "");
  const [priceUsd, setPriceUsd] = useState(transaction ? String(transaction.price_usd) : "");
  const [totalAmount, setTotalAmount] = useState("");
  const initDateStr = transaction && transaction.ts !== 0
    ? tsToDateStr(transaction.ts)
    : new Date().toISOString().slice(0, 10);
  const [initY, initM, initD] = initDateStr.split("-");
  const [dateYear, setDateYear] = useState(initY ?? "");
  const [dateMonth, setDateMonth] = useState(initM ?? "");
  const [dateDay, setDateDay] = useState(initD ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [error, setError] = useState("");
  const { data: assets } = useAssets();
  const addTransaction = useAddTransaction(effectiveAssetId || selectedAssetId);
  const updateTx = useUpdateTransaction(effectiveAssetId || selectedAssetId);

  function reset() {
    if (isEdit) return;
    setSelectedAssetId("");
    setTxType("buy");
    setInputMode("quantity");
    setQuantity("");
    setPriceUsd("");
    setTotalAmount("");
    const todayParts = new Date().toISOString().slice(0, 10).split("-");
    setDateYear(todayParts[0] ?? "");
    setDateMonth(todayParts[1] ?? "");
    setDateDay(todayParts[2] ?? "");
    setNotes("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isEdit && !assetId && !selectedAssetId) {
      setError("Please select an asset");
      return;
    }

    let price: number;
    let qty: number;

    if (inputMode === "conversion") {
      qty = parseFloat(quantity);
      const total = parseFloat(totalAmount);
      if (isNaN(qty) || qty <= 0) {
        setError("Quantity received must be a positive number");
        return;
      }
      if (isNaN(total) || total <= 0) {
        setError("Total paid must be a positive number");
        return;
      }
      price = total / qty;
    } else if (inputMode === "total") {
      price = parseFloat(priceUsd);
      if (isNaN(price) || price <= 0) {
        setError("Price must be a positive number");
        return;
      }
      const total = parseFloat(totalAmount);
      if (isNaN(total) || total <= 0) {
        setError("Total amount must be a positive number");
        return;
      }
      qty = total / price;
    } else {
      price = parseFloat(priceUsd);
      if (isNaN(price) || price <= 0) {
        setError("Price must be a positive number");
        return;
      }
      qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        setError("Quantity must be a positive number");
        return;
      }
    }

    if (!isFinite(qty) || qty <= 0) {
      setError("Computed quantity is invalid");
      return;
    }
    if (!isFinite(price) || price <= 0) {
      setError("Computed price is invalid");
      return;
    }

    if (!dateYear || !dateMonth || !dateDay) {
      setError("Please select a complete date");
      return;
    }
    const ts = Math.floor(new Date(`${dateYear}-${dateMonth}-${dateDay}`).getTime() / 1000);

    try {
      if (isEdit) {
        await updateTx.mutateAsync({
          id: transaction.id,
          txType,
          quantity: qty,
          priceUsd: price,
          ts,
          notes: notes.trim() || undefined,
        });
      } else {
        await addTransaction.mutateAsync({
          txType,
          quantity: qty,
          priceUsd: price,
          ts,
          notes: notes.trim() || undefined,
        });
      }
      reset();
      setOpen(false);
    } catch (err) {
      setError(String(err));
    }
  }

  const isPending = isEdit ? updateTx.isPending : addTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!isEdit && !onOpenChange && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && transaction.locked_at !== null && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              This transaction is locked. Changes will affect your portfolio history.
            </div>
          )}
          {!isEdit && !assetId && (
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {(assets ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.symbol} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={txType} onValueChange={(v) => setTxType(v as TxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex rounded-md bg-zinc-800 p-0.5">
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${inputMode === "quantity" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setInputMode("quantity")}
              >
                By Quantity
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${inputMode === "total" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setInputMode("total")}
              >
                By Total
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${inputMode === "conversion" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setInputMode("conversion")}
              >
                By Conversion
              </button>
            </div>
          {inputMode === "quantity" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceUsd">Price per unit (USD)</Label>
                <Input
                  id="priceUsd"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 50000"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                />
              </div>
              {quantity && priceUsd && parseFloat(quantity) > 0 && parseFloat(priceUsd) > 0 && (
                <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                  Total: <span className="text-zinc-200">${(parseFloat(quantity) * parseFloat(priceUsd)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </>
          ) : inputMode === "total" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (USD)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceUsd">Price per unit (USD)</Label>
                <Input
                  id="priceUsd"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 50000"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                />
              </div>
              {totalAmount && priceUsd && parseFloat(totalAmount) > 0 && parseFloat(priceUsd) > 0 && (
                <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                  Quantity: <span className="text-zinc-200">{(parseFloat(totalAmount) / parseFloat(priceUsd)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity received</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 0.012"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total paid (USD)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 500"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              {quantity && totalAmount && parseFloat(quantity) > 0 && parseFloat(totalAmount) > 0 && (
                <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                  Price per unit: <span className="text-zinc-200">${(parseFloat(totalAmount) / parseFloat(quantity)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label>Date</Label>
            <div className="flex gap-2">
                <Select
                  value={dateYear}
                  onValueChange={(y) => {
                    setDateYear(y);
                    const max = daysInMonth(y, dateMonth);
                    if (dateDay && parseInt(dateDay) > max) setDateDay(String(max).padStart(2, "0"));
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dateMonth}
                  onValueChange={(m) => {
                    setDateMonth(m);
                    const max = daysInMonth(dateYear, m);
                    if (dateDay && parseInt(dateDay) > max) setDateDay(String(max).padStart(2, "0"));
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => {
                      const val = String(i + 1).padStart(2, "0");
                      return <SelectItem key={val} value={val}>{name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={dateDay} onValueChange={setDateDay}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: daysInMonth(dateYear, dateMonth) }, (_, i) => {
                      const val = String(i + 1).padStart(2, "0");
                      return <SelectItem key={val} value={val}>{i + 1}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. DCA purchase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? (isEdit ? "Saving..." : "Adding...")
              : isEdit && transaction.locked_at !== null
              ? "Override & Save"
              : isEdit
              ? "Save Changes"
              : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
