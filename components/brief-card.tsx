"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Lock } from "lucide-react";
import type { Aspect, Brief, N8nResponse, Progress, Reward, Style } from "@/lib/n8n";
import { DIRECTION_LEVEL, FORMATS, STYLES } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailGate } from "@/components/email-gate";

type Props = {
  brief: Brief;
  progress: Progress;
  photo: File | null;
  onAttach: () => void;
  onShot: (jobId: string, progress: Progress) => void;
  onReward: (r: Reward) => void;
  onMerged: () => void;
};

export function BriefCard({ brief, progress, photo, onAttach, onShot, onReward, onMerged }: Props) {
  const [aspect, setAspect] = useState<Aspect>("square");
  const [style, setStyle] = useState<Style>("auto");
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDirect = progress.unlocks.direction;
  const toNext = progress.nextXp === null ? null : progress.nextXp - progress.xp;

  async function shoot() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("title", brief.title);
    form.append("description", brief.description);
    form.append("aspect", aspect);
    form.append("style", style);
    if (canDirect) form.append("direction", direction);
    form.append("photo", photo, photo.name);
    try {
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const json = (await res.json()) as N8nResponse<{ jobId: string; progress: Progress }>;
      if (json.data?.progress) onReward({ progress: json.data.progress });
      if (!json.success || !json.data?.jobId) throw new Error(json.error ?? "Something went wrong.");
      onShot(json.data.jobId, json.data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <section className="animate-rise rounded-xl border bg-card">
      <header className="border-b px-4 py-3">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Shoot brief</p>
        <h3 className="mt-1 font-heading text-xl leading-tight">{brief.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{brief.description}</p>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        <Field label="Format">
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <Choice
                key={f.id}
                selected={aspect === f.id}
                locked={!progress.unlocks.formats.includes(f.id)}
                level={f.level}
                onClick={() => setAspect(f.id)}
              >
                {f.label} <span className="text-muted-foreground tabular-nums">{f.ratio}</span>
              </Choice>
            ))}
          </div>
        </Field>
        <Field label="Scene">
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <Choice
                key={s.id}
                selected={style === s.id}
                locked={!progress.unlocks.styles.includes(s.id)}
                level={s.level}
                onClick={() => setStyle(s.id)}
              >
                {s.label}
              </Choice>
            ))}
          </div>
        </Field>
        <Field label="Art direction">
          {canDirect ? (
            <Input
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              maxLength={300}
              placeholder="e.g. a single shaft of light, wet sand, no props"
              className="h-9"
            />
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> Unlocks at level {DIRECTION_LEVEL}
            </p>
          )}
        </Field>
      </div>

      <footer className="flex flex-col gap-3 border-t px-4 py-4">
        {!progress.email ? (
          <EmailGate onReward={onReward} onMerged={onMerged} />
        ) : !photo ? (
          <Button variant="outline" size="lg" onClick={onAttach} className="h-10 self-start">
            <ImagePlus /> Attach your product photo
          </Button>
        ) : progress.credits < 1 ? (
          <p className="text-sm">
            No shoots left.{" "}
            <span className="text-muted-foreground">
              {toNext === null ? "You've earned every level." : `${toNext} XP to ${progress.nextTitle} earns your next one. Keep the conversation going.`}
            </span>
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              Uses 1 of {progress.credits} shoot{progress.credits === 1 ? "" : "s"}
            </p>
            <Button size="lg" disabled={busy} onClick={shoot} className="h-10 bg-signal px-4 text-signal-foreground hover:bg-signal/90">
              {busy && <Loader2 className="animate-spin" />}
              {busy ? "Starting…" : "Shoot it"}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </footer>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

function Choice({
  selected,
  locked,
  level,
  onClick,
  children,
}: {
  selected: boolean;
  locked: boolean;
  level: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={selected}
      onClick={onClick}
      title={locked ? `Unlocks at level ${level}` : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "border-foreground bg-foreground text-background [&_span]:text-background/60" : "bg-background hover:border-foreground/40",
        locked && "cursor-not-allowed border-dashed text-muted-foreground hover:border-border",
      )}
    >
      {locked && <Lock className="size-3" />}
      {children}
      {locked && <span className="text-[11px] tabular-nums">Lv {level}</span>}
    </button>
  );
}
