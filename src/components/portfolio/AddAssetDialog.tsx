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
import { useAddAsset } from "@/hooks/useAssets";
import { addTransaction } from "@/lib/tauri/transactions";
import type { AssetType } from "@/types";
import { Plus } from "lucide-react";

export function AddAssetDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [error, setError] = useState("");
  const addAsset = useAddAsset();

  function reset() {
    setSymbol("");
    setName("");
    setAssetType("stock");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPurchaseQty("");
    setPurchasePrice("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const hasQty = purchaseQty !== "";
    const hasPrice = purchasePrice !== "";
    // date is pre-filled; use qty/price to detect if the user intends to record a purchase
    const hasAny = hasQty || hasPrice;
    const hasAll = purchaseDate !== "" && hasQty && hasPrice;

    if (hasAny && !hasAll) {
      setError("Complete all purchase fields or leave them all empty");
      return;
    }

    let parsedQty: number | undefined;
    let parsedPrice: number | undefined;
    if (hasAll) {
      parsedQty = parseFloat(purchaseQty);
      parsedPrice = parseFloat(purchasePrice);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        setError("Purchase quantity must be a positive number");
        return;
      }
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        setError("Purchase price must be a positive number");
        return;
      }
    }

    try {
      const asset = await addAsset.mutateAsync({ symbol: symbol.trim(), name: name.trim(), assetType });
      if (hasAll && parsedQty !== undefined && parsedPrice !== undefined) {
        const ts = Math.floor(new Date(purchaseDate).getTime() / 1000);
        await addTransaction(asset.id, "buy", parsedQty, parsedPrice, ts, undefined);
      }
      reset();
      setOpen(false);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g. AAPL, BTC, GOLD"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Apple Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="commodity">Commodity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Initial Purchase (optional)
            </p>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseQty">Quantity</Label>
              <Input
                id="purchaseQty"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 10"
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Price per unit (USD)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 150.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={addAsset.isPending}>
            {addAsset.isPending ? "Adding..." : "Add Asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
