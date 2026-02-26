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
import { Pencil, Plus } from "lucide-react";

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
  const [quantity, setQuantity] = useState(transaction ? String(transaction.quantity) : "");
  const [priceUsd, setPriceUsd] = useState(transaction ? String(transaction.price_usd) : "");
  const [date, setDate] = useState(transaction ? tsToDateStr(transaction.ts) : () => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [error, setError] = useState("");
  const { data: assets } = useAssets();
  const addTransaction = useAddTransaction(effectiveAssetId || selectedAssetId);
  const updateTx = useUpdateTransaction(effectiveAssetId || selectedAssetId);

  function reset() {
    if (isEdit) return;
    setSelectedAssetId("");
    setTxType("buy");
    setQuantity("");
    setPriceUsd("");
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

    const qty = parseFloat(quantity);
    const price = parseFloat(priceUsd);

    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError("Price must be a positive number");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    const ts = Math.floor(new Date(date).getTime() / 1000);

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
      {!isEdit && (
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
            <Label htmlFor="priceUsd">Price (USD)</Label>
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
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
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
              : (isEdit ? "Save Changes" : "Add Transaction")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
