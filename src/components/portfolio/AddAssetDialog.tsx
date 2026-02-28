import { useState, useRef } from "react";
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
import { useSymbolSearch } from "@/hooks/useSymbolSearch";
import { addTransaction } from "@/lib/tauri/transactions";
import type { AssetType, SymbolSearchResult } from "@/types";
import { Plus, Search } from "lucide-react";

const providerBadgeClass: Record<string, string> = {
  TwelveData: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  CoinGecko: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  Binance: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
};

const typeBadgeClass: Record<string, string> = {
  stock: "text-blue-400",
  crypto: "text-violet-400",
  commodity: "text-amber-400",
};

export function AddAssetDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [purchaseMode, setPurchaseMode] = useState<"quantity" | "total" | "conversion">("quantity");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseTotal, setPurchaseTotal] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [error, setError] = useState("");
  const addAsset = useAddAsset();
  const { data: searchResults, isLoading: isSearching } = useSymbolSearch(searchQuery);
  const searchRef = useRef<HTMLDivElement>(null);

  function reset() {
    setSearchQuery("");
    setShowResults(false);
    setSymbol("");
    setName("");
    setAssetType("stock");
    setPurchaseMode("quantity");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPurchaseQty("");
    setPurchaseTotal("");
    setPurchasePrice("");
    setError("");
  }

  function handleSelectResult(result: SymbolSearchResult) {
    setSymbol(result.symbol);
    setName(result.name);
    const mapped = result.asset_type as AssetType;
    if (mapped === "stock" || mapped === "crypto" || mapped === "commodity") {
      setAssetType(mapped);
    }
    setShowResults(false);
    setSearchQuery("");
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

    let hasAny: boolean;
    let hasAll: boolean;
    if (purchaseMode === "conversion") {
      const hasQty = purchaseQty !== "";
      const hasTotal = purchaseTotal !== "";
      hasAny = hasQty || hasTotal;
      hasAll = purchaseDate !== "" && hasQty && hasTotal;
    } else {
      const hasAmount = purchaseMode === "quantity" ? purchaseQty !== "" : purchaseTotal !== "";
      const hasPrice = purchasePrice !== "";
      hasAny = hasAmount || hasPrice;
      hasAll = purchaseDate !== "" && hasAmount && hasPrice;
    }

    if (hasAny && !hasAll) {
      setError("Complete all purchase fields or leave them all empty");
      return;
    }

    let parsedQty: number | undefined;
    let parsedPrice: number | undefined;
    if (hasAll) {
      if (purchaseMode === "conversion") {
        const parsedQtyVal = parseFloat(purchaseQty);
        const parsedTotalVal = parseFloat(purchaseTotal);
        if (isNaN(parsedQtyVal) || parsedQtyVal <= 0) {
          setError("Quantity received must be a positive number");
          return;
        }
        if (isNaN(parsedTotalVal) || parsedTotalVal <= 0) {
          setError("Total paid must be a positive number");
          return;
        }
        parsedQty = parsedQtyVal;
        parsedPrice = parsedTotalVal / parsedQtyVal;
      } else if (purchaseMode === "total") {
        parsedPrice = parseFloat(purchasePrice);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          setError("Purchase price must be a positive number");
          return;
        }
        const parsedTotal = parseFloat(purchaseTotal);
        if (isNaN(parsedTotal) || parsedTotal <= 0) {
          setError("Total amount must be a positive number");
          return;
        }
        parsedQty = parsedTotal / parsedPrice;
      } else {
        parsedPrice = parseFloat(purchasePrice);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          setError("Purchase price must be a positive number");
          return;
        }
        parsedQty = parseFloat(purchaseQty);
        if (isNaN(parsedQty) || parsedQty <= 0) {
          setError("Purchase quantity must be a positive number");
          return;
        }
      }
      if (!isFinite(parsedQty) || parsedQty <= 0) {
        setError("Computed quantity is invalid");
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
          {/* Search input */}
          <div className="relative" ref={searchRef}>
            <Label htmlFor="search">Search ticker</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                className="pl-9"
                placeholder="Search e.g. AAPL, Bitcoin, Tesla..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => { if (searchQuery.trim()) setShowResults(true); }}
                autoFocus
                autoComplete="off"
              />
            </div>
            {showResults && searchQuery.trim().length >= 1 && (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Searching...</div>
                )}
                {!isSearching && searchResults && searchResults.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No results found. You can still fill in fields manually.</div>
                )}
                {!isSearching && searchResults && searchResults.map((result, i) => (
                  <button
                    key={`${result.provider}-${result.symbol}-${i}`}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-zinc-800"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-zinc-100">{result.symbol}</span>
                      <span className="truncate text-sm text-zinc-400">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {result.exchange && (
                        <span className="text-xs text-zinc-500">{result.exchange}</span>
                      )}
                      <span className={`text-xs ${typeBadgeClass[result.asset_type] ?? "text-zinc-400"}`}>
                        {result.asset_type}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 text-xs ${providerBadgeClass[result.provider] ?? ""}`}>
                        {result.provider}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Symbol / Name / Type fields */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g. AAPL, BTC, GOLD"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
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
            <>

            <div className="flex rounded-md bg-zinc-800 p-0.5">
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${purchaseMode === "quantity" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setPurchaseMode("quantity")}
              >
                By Quantity
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${purchaseMode === "total" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setPurchaseMode("total")}
              >
                By Total
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${purchaseMode === "conversion" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-300"}`}
                onClick={() => setPurchaseMode("conversion")}
              >
                By Conversion
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            {purchaseMode === "quantity" ? (
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
            ) : purchaseMode === "total" ? (
              <div className="space-y-2">
                <Label htmlFor="purchaseTotal">Total Amount (USD)</Label>
                <Input
                  id="purchaseTotal"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1000"
                  value={purchaseTotal}
                  onChange={(e) => setPurchaseTotal(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="purchaseQty">Quantity received</Label>
                  <Input
                    id="purchaseQty"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 0.012"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseTotal">Total paid (USD)</Label>
                  <Input
                    id="purchaseTotal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 500"
                    value={purchaseTotal}
                    onChange={(e) => setPurchaseTotal(e.target.value)}
                  />
                </div>
              </>
            )}
            {purchaseMode !== "conversion" && (
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
            )}
            {purchaseMode === "quantity" && purchaseQty && purchasePrice && parseFloat(purchaseQty) > 0 && parseFloat(purchasePrice) > 0 && (
              <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                Total: <span className="text-zinc-200">${(parseFloat(purchaseQty) * parseFloat(purchasePrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {purchaseMode === "total" && purchaseTotal && purchasePrice && parseFloat(purchaseTotal) > 0 && parseFloat(purchasePrice) > 0 && (
              <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                Quantity: <span className="text-zinc-200">{(parseFloat(purchaseTotal) / parseFloat(purchasePrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
              </div>
            )}
            {purchaseMode === "conversion" && purchaseQty && purchaseTotal && parseFloat(purchaseQty) > 0 && parseFloat(purchaseTotal) > 0 && (
              <div className="rounded-md bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                Price per unit: <span className="text-zinc-200">${(parseFloat(purchaseTotal) / parseFloat(purchaseQty)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
              </div>
            )}
            </>
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
