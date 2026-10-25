"use client";

import { useState } from "react";
import { Check, ExternalLink, Lock } from "lucide-react";
import type { Ad, Progress } from "@/lib/n8n";
import { LEVELS, XP_RULES } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function levelProgress(p: Progress) {
  if (p.nextXp === null) return 1;
  return Math.min(1, Math.max(0, (p.xp - p.levelXp) / (p.nextXp - p.levelXp)));
}

export function Tracker({ progress, ads }: { progress: Progress; ads: Ad[] }) {
  return (
    <div className="flex flex-col gap-9 p-6">
      <LevelCard progress={progress} />
      <Stats progress={progress} />
      <Ladder level={progress.level} />
      <Gallery ads={ads} />
      <Rules />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{children}</h2>;
}

function LevelCard({ progress: p }: { progress: Progress }) {
  const next = LEVELS[p.level];
  return (
    <section className="flex items-center gap-5">
      <LevelRing progress={p} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-heading text-2xl leading-tight">
          <span key={p.title} className="animate-rise">{p.title}</span>
          {p.unlocks.signature && (
            <span className="rounded-full border border-signal/40 px-2 py-0.5 font-sans text-[10px] font-medium tracking-wider text-signal uppercase">
              Signature
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {p.nextXp === null ? `${p.xp} XP, top level` : `${p.xp} / ${p.nextXp} XP`}
        </p>
        {next && <p className="mt-2 text-xs leading-snug text-muted-foreground">Next: {next.unlock.toLowerCase()}</p>}
      </div>
    </section>
  );
}

export function LevelRing({ progress, size = 76 }: { progress: Progress; size?: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="3" className="stroke-border" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - levelProgress(progress))}
          className="stroke-signal transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {size < 48 ? (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium tabular-nums">{progress.level}</span>
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[9px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Lvl</span>
          <span className="font-heading text-[28px] tabular-nums">{progress.level}</span>
        </span>
      )}
    </div>
  );
}

function Stats({ progress: p }: { progress: Progress }) {
  const items = [
    { label: "Shoots left", value: p.credits },
    { label: "Day streak", value: p.streak },
    { label: "Messages", value: p.messages },
    { label: "Ads made", value: p.ads },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 font-heading text-2xl tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ladder({ level }: { level: number }) {
  return (
    <section>
      <SectionTitle>Levels</SectionTitle>
      <ol className="flex flex-col">
        {LEVELS.map((l) => {
          const state = l.level < level ? "done" : l.level === level ? "current" : "locked";
          return (
            <li key={l.level} className="flex gap-3 border-t py-2.5 first:border-t-0">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                  state === "done" && "border-foreground bg-foreground text-background",
                  state === "current" && "border-signal text-signal",
                  state === "locked" && "text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3" /> : state === "locked" ? <Lock className="size-2.5" /> : l.level}
              </span>
              <div className={cn("text-sm", state === "locked" && "text-muted-foreground")}>
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.unlock}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Gallery({ ads }: { ads: Ad[] }) {
  const [open, setOpen] = useState<Ad | null>(null);
  return (
    <section>
      <SectionTitle>Your ads</SectionTitle>
      {ads.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
          Finished shoots appear here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {ads.map((ad) => (
            <li key={ad.jobId}>
              <button
                type="button"
                onClick={() => setOpen(ad)}
                className="block aspect-square w-full overflow-hidden rounded-lg border bg-muted transition hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.title} loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          {open && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.imageUrl} alt={open.title} className="w-full rounded-lg border" />
              <DialogTitle className="font-heading text-xl font-normal">{open.title}</DialogTitle>
              {open.prompt && <DialogDescription className="line-clamp-4">{open.prompt}</DialogDescription>}
              <a href={open.imageUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                <ExternalLink /> Open full size
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Rules() {
  return (
    <section>
      <SectionTitle>How to earn XP</SectionTitle>
      <dl className="flex flex-col gap-1.5 text-xs">
        {XP_RULES.map(([label, xp]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right tabular-nums">{xp}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">Up to 20 rewarded actions a day.</p>
    </section>
  );
}
