"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { N8nResponse, Progress, Reward } from "@/lib/n8n";
import { Button } from "@/components/ui/button";

const PERKS = ["Up to 20 shoots a day", "No credits needed", "Every format and scene style"];

// Shown when a free member has used today's shoots. Joining the waitlist emails the owner.
export function ProUpsell({ progress, onReward }: { progress: Progress; onReward: (r: Reward) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pro" }),
      });
      const json = (await res.json()) as N8nResponse<Reward>;
      if (!json.success || !json.data) throw new Error(json.error ?? "Something went wrong.");
      onReward(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-signal/30 bg-signal/5 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-signal" /> You&apos;ve used today&apos;s {progress.dailyLimit} free shoots
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          They reset tomorrow. Want more? Join Go 2 Market Pro, our Ad Club for brands that ship ads every day.
        </p>
      </div>
      <ul className="flex flex-col gap-1 text-xs">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-1.5">
            <Check className="size-3 text-signal" /> {perk}
          </li>
        ))}
      </ul>
      {progress.proInterest ? (
        <p className="text-xs font-medium">You&apos;re on the Pro list. We&apos;ll email {progress.email} when your spot opens.</p>
      ) : (
        <Button size="lg" disabled={busy} onClick={join} className="h-9 self-start bg-signal px-4 text-signal-foreground hover:bg-signal/90">
          {busy && <Loader2 className="animate-spin" />}
          Join the Pro waitlist
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
