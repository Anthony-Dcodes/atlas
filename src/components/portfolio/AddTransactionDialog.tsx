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
  const [unknownDate, setUnknownDate] = useState(transaction !== undefined && transaction.ts === 0);
  const [date, setDate] = useState(
    transaction && transaction.ts !== 0
      ? tsToDateStr(transaction.ts)
      : new Date().toISOString().slice(0, 10)
  );
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
    setUnknownDate(false);
    setDate(new Date().toISOString().slice(0, 10));
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

    if (txType === "snapshot") {
      qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        setError("Quantity must be a positive number");
        return;
      }
      price = 0;
    } else if (inputMode === "conversion") {
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
    if (txType !== "snapshot" && (!isFinite(price) || price <= 0)) {
      setError("Computed price is invalid");
      return;
    }

    const ts = unknownDate ? 0 : Math.floor(new Date(date).getTime() / 1000);

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
                <SelectItem value="snapshot">Balance Snapshot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {txType === "snapshot" ? (
            <div className="rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400">
              Records how much you hold as of a date, without cost basis. Use this when you have an asset but don't know when or how you acquired it.
            </div>
          ) : (
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
          )}
          {txType === "snapshot" ? (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 5.0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          ) : inputMode === "quantity" ? (
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
            <Label htmlFor="date">Date{txType === "snapshot" ? " (optional)" : ""}</Label>
            {txType === "snapshot" && (
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unknownDate}
                  onChange={(e) => setUnknownDate(e.target.checked)}
                  className="rounded"
                />
                Unknown / from the beginning
              </label>
            )}
            {!unknownDate && (
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
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
