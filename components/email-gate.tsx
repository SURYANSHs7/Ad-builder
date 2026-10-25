"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { N8nResponse, Reward } from "@/lib/n8n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = Reward & { sent?: boolean; mergedUid?: string | null };

// Two steps: send a 6-digit code, then verify it. Verifying unlocks the first free shoot.
export function EmailGate({ onReward, onMerged }: { onReward: (r: Reward) => void; onMerged: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(step === "email" ? { action: "start", email } : { action: "verify", code }),
      });
      const json = (await res.json()) as N8nResponse<Result>;
      if (!json.success || !json.data) throw new Error(json.error ?? "Something went wrong.");
      if (step === "email") {
        setStep("code");
      } else if (json.data.mergedUid) {
        onMerged();
      } else {
        onReward(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <p className="text-sm">
        {step === "email" ? (
          <>Verify your email to unlock your <span className="font-medium">free first shoot</span>. We also send the finished ad there.</>
        ) : (
          <>We sent a 6-digit code to <span className="font-medium">{email}</span>.</>
        )}
      </p>
      <div className="flex gap-2">
        {step === "email" ? (
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9"
          />
        ) : (
          <Input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-9 tracking-[0.3em] tabular-nums"
            autoFocus
          />
        )}
        <Button type="submit" size="lg" disabled={busy} className="h-9 shrink-0">
          {busy && <Loader2 className="animate-spin" />}
          {step === "email" ? "Send code" : "Verify"}
        </Button>
      </div>
      {step === "code" && (
        <button type="button" onClick={() => { setStep("email"); setCode(""); }} className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline">
          Use a different email
        </button>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
