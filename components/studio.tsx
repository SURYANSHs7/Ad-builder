"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Ad, Me, N8nResponse, Progress, Reward } from "@/lib/n8n";
import { LEVELS } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Chat } from "@/components/chat";
import { LevelRing, Tracker, levelProgress } from "@/components/tracker";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; me: Me };

export function Studio() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [gain, setGain] = useState<{ amount: number; id: number } | null>(null);
  const [toast, setToast] = useState<Progress | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async (full: boolean) => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = (await res.json()) as N8nResponse<Me>;
      if (!json.success || !json.data) throw new Error(json.error ?? "Couldn't load your studio.");
      setProgress(json.data.progress);
      setAds(json.data.ads);
      if (full) setState({ kind: "ready", me: json.data });
    } catch (err) {
      if (full) setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load your studio." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load(true);
  }, [load]);

  const onReward = useCallback((r: Reward) => {
    setProgress(r.progress);
    if (r.gained) setGain((g) => ({ amount: r.gained!, id: (g?.id ?? 0) + 1 }));
    if (r.leveledUp) {
      setToast(r.progress);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }
  }, []);

  // A finished shoot changes XP, credits and the gallery on the server.
  const onShootFinished = useCallback(async () => {
    const before = progress?.level ?? 0;
    const res = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as N8nResponse<Me> | null;
    if (!json?.success || !json.data) return;
    setAds(json.data.ads);
    onReward({ progress: json.data.progress, gained: 50, leveledUp: json.data.progress.level > before });
  }, [progress?.level, onReward]);

  const onMerged = useCallback(() => window.location.reload(), []);

  if (state.kind === "loading") return <Skeleton />;
  if (state.kind === "error" || !progress) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">{state.kind === "error" ? state.message : "Couldn't load your studio."}</p>
        <Button variant="outline" onClick={() => { setState({ kind: "loading" }); load(true); }}>
          <RotateCcw /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="relative flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-xl">Go 2 Market</span>
          <span className="hidden text-[11px] tracking-[0.16em] text-muted-foreground uppercase sm:inline">Studio</span>
        </p>
        <p className="hidden text-xs text-muted-foreground lg:block">{progress.email ?? "Guest session"}</p>
        <Sheet>
          <SheetTrigger className="flex items-center gap-2.5 rounded-full border bg-card py-1 pr-3 pl-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden">
            <LevelRing progress={progress} size={28} />
            <span className="font-medium">{progress.title}</span>
            <span className="text-muted-foreground tabular-nums">
              {progress.credits} shoot{progress.credits === 1 ? "" : "s"}
            </span>
          </SheetTrigger>
          <SheetContent className="w-[88%] overflow-y-auto bg-background p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">Your progress</SheetTitle>
            <Tracker progress={progress} ads={ads} />
          </SheetContent>
        </Sheet>
        <div className="absolute inset-x-0 -bottom-px h-px bg-border lg:hidden">
          <div className="h-full bg-signal transition-[width] duration-700 ease-out" style={{ width: `${levelProgress(progress) * 100}%` }} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <Chat
            initialMessages={state.me.messages}
            progress={progress}
            gain={gain}
            onReward={onReward}
            onShootFinished={onShootFinished}
            onMerged={onMerged}
          />
        </main>
        <aside aria-label="Your progress" className="hidden w-[340px] shrink-0 overflow-y-auto border-l bg-card/40 lg:block">
          <Tracker progress={progress} ads={ads} />
        </aside>
      </div>

      {toast && <LevelToast progress={toast} />}
    </div>
  );
}

function LevelToast({ progress }: { progress: Progress }) {
  const unlock = LEVELS[progress.level - 1]?.unlock;
  return (
    <div role="status" className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 animate-rise rounded-xl bg-foreground px-4 py-3 text-background shadow-lg lg:left-[calc(50%-170px)]">
      <p className="font-heading text-lg leading-tight">
        Level {progress.level}, {progress.title}
      </p>
      {unlock && <p className="mt-0.5 text-xs text-background/70">Unlocked: {unlock.toLowerCase()}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy>
      <div className="h-14 border-b" />
      <div className="flex flex-1">
        <div className="mx-auto w-full max-w-[680px] space-y-4 px-6 pt-[14vh]">
          <div className="h-12 w-3/4 animate-develop rounded-lg bg-muted" />
          <div className="h-4 w-1/2 animate-develop rounded bg-muted" />
        </div>
        <div className="hidden w-[340px] border-l lg:block" />
      </div>
    </div>
  );
}
