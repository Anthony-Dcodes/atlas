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
import type { AssetType } from "@/types";
import { Plus } from "lucide-react";

export function AddAssetDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [error, setError] = useState("");
  const addAsset = useAddAsset();

  function reset() {
    setSymbol("");
    setName("");
    setAssetType("stock");
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

    try {
      await addAsset.mutateAsync({ symbol: symbol.trim(), name: name.trim(), assetType });
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={addAsset.isPending}>
            {addAsset.isPending ? "Adding..." : "Add Asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
