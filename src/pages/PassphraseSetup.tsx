import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setupDb } from "@/lib/tauri/auth";

interface Props {
  onSuccess: () => void;
}

export function PassphraseSetup({ onSuccess }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters");
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match");
      return;
    }

    setLoading(true);
    try {
      await setupDb(passphrase);
      onSuccess();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Atlas</CardTitle>
          <CardDescription>
            Create a passphrase to encrypt your local database. This passphrase will be required
            every time you open Atlas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                placeholder="At least 8 characters"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Passphrase</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Re-enter passphrase"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating database..." : "Create Database"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
