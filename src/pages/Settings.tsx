import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveApiKey, hasApiKey, removeApiKey, getSetting, saveSetting } from "@/lib/tauri/settings";
import { Check, X } from "lucide-react";

interface ApiKeyFieldProps {
  provider: string;
  label: string;
  description: string;
}

function ApiKeyField({ provider, label, description }: ApiKeyFieldProps) {
  const [keyValue, setKeyValue] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    hasApiKey(provider).then(setHasKey).catch(() => {});
  }, [provider]);

  async function handleSave() {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      await saveApiKey(provider, keyValue.trim());
      setHasKey(true);
      setKeyValue("");
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    try {
      await removeApiKey(provider);
      setHasKey(false);
      setMessage("Removed");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage(String(err));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {hasKey && (
          <span className="flex items-center gap-1 text-xs text-green">
            <Check className="h-3 w-3" /> Configured
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={hasKey ? "••••••••" : "Enter API key"}
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
        />
        <Button size="sm" onClick={handleSave} disabled={saving || !keyValue.trim()}>
          Save
        </Button>
        {hasKey && (
          <Button size="sm" variant="ghost" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

export function SettingsPage() {
  const [refreshInterval, setRefreshInterval] = useState("3600");

  useEffect(() => {
    getSetting("refresh_interval").then((val) => {
      if (val) setRefreshInterval(val);
    }).catch(() => {});
  }, []);

  async function handleRefreshIntervalChange(value: string) {
    setRefreshInterval(value);
    await saveSetting("refresh_interval", value);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure API keys for market data providers. Keys are stored encrypted in your local
            database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ApiKeyField
            provider="twelve_data"
            label="Twelve Data"
            description="Required for stocks and commodities. Get a free key at twelvedata.com"
          />
          <ApiKeyField
            provider="alpha_vantage"
            label="Alpha Vantage"
            description="Optional. Used for macro data (CPI, GDP). Get a key at alphavantage.co"
          />
          <ApiKeyField
            provider="coingecko"
            label="CoinGecko"
            description="Required for cryptocurrency data. Get a free Demo key at coingecko.com/api/pricing"
          />
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Auto-refresh Interval</Label>
            <Select value={refreshInterval} onValueChange={handleRefreshIntervalChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1800">30 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
                <SelectItem value="7200">2 hours</SelectItem>
                <SelectItem value="14400">4 hours</SelectItem>
                <SelectItem value="86400">Daily</SelectItem>
                <SelectItem value="0">Manual only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Atlas v0.1.0</p>
          <p>Local-first portfolio dashboard. All data encrypted at rest.</p>
          <p>No accounts, no telemetry, no cloud dependency.</p>
        </CardContent>
      </Card>
    </div>
  );
}
