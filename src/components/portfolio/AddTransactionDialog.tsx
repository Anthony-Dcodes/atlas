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
import { useAddTransaction } from "@/hooks/useTransactions";
import { useAssets } from "@/hooks/useAssets";
import type { TxType } from "@/types";
import { Plus } from "lucide-react";

interface Props {
  assetId?: string;
}

export function AddTransactionDialog({ assetId }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [txType, setTxType] = useState<TxType>("buy");
  const [quantity, setQuantity] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const { data: assets } = useAssets();
  const addTransaction = useAddTransaction(assetId ?? selectedAssetId);

  function reset() {
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

    if (!assetId && !selectedAssetId) {
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
      await addTransaction.mutateAsync({
        txType,
        quantity: qty,
        priceUsd: price,
        ts,
        notes: notes.trim() || undefined,
      });
      reset();
      setOpen(false);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!assetId && (
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
          <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
            {addTransaction.isPending ? "Adding..." : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
