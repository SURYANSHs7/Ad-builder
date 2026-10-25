"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Brief, Job, N8nResponse } from "@/lib/n8n";
import { Button, buttonVariants } from "@/components/ui/button";

const POLL_MS = 3000;
const TIMEOUT_MS = 6 * 60 * 1000;

const STEP_LABEL = {
  prompt: "Writing the scene",
  photo: "Shooting your product",
} as const;

type View = { kind: "loading" } | { kind: "job"; job: Job } | { kind: "error"; message: string };

// Inline result of a shoot. Polls the job until it's done, so it also resumes after a reload.
export function ShotCard({ jobId, brief, onFinished }: { jobId: string; brief: Brief | null; onFinished?: () => void }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const finishedRef = useRef(onFinished);
  useEffect(() => {
    finishedRef.current = onFinished;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let first = true;
    const deadline = Date.now() + TIMEOUT_MS;

    async function poll() {
      try {
        const res = await fetch(`/api/status/${jobId}`, { cache: "no-store" });
        const json = (await res.json()) as N8nResponse<Job>;
        if (cancelled) return;
        if (res.status === 404) return setView({ kind: "error", message: "We couldn't find this shoot." });
        if (json.success && json.data) {
          setView({ kind: "job", job: json.data });
          const ended = json.data.status === "done" || json.data.status === "failed";
          // Only report shoots that finish while the page is open, not ones loaded from history.
          if (ended && !first) finishedRef.current?.();
          if (ended) return;
        }
      } catch {
        // Transient network error: keep polling until the deadline.
      }
      first = false;
      if (cancelled) return;
      if (Date.now() > deadline) {
        return setView({ kind: "error", message: "This is taking longer than usual. We'll email the result when it's ready." });
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  const title = (view.kind === "job" && view.job.title) || brief?.title || "Your shoot";

  return (
    <figure className="animate-rise overflow-hidden rounded-xl border bg-card">
      <figcaption className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <span className="truncate font-heading text-lg">{title}</span>
        <span className="shrink-0 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Shoot</span>
      </figcaption>
      <Body view={view} />
    </figure>
  );
}

function Body({ view }: { view: View }) {
  if (view.kind === "error") return <p className="p-4 text-sm text-muted-foreground">{view.message}</p>;
  if (view.kind === "job" && view.job.status === "failed") {
    return <p role="alert" className="p-4 text-sm text-destructive">{view.job.error ?? "This shoot failed. Your credit was refunded."}</p>;
  }
  if (view.kind === "job" && view.job.status === "done" && view.job.imageUrl) return <Result job={view.job} />;

  const step = view.kind === "job" && view.job.status === "photo" ? "photo" : "prompt";
  return (
    <div className="relative aspect-square bg-muted" aria-live="polite">
      <div className="absolute inset-0 animate-develop bg-[radial-gradient(circle_at_50%_45%,var(--card),transparent_65%)]" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 text-sm">
        <span>{STEP_LABEL[step]}…</span>
        <span className="text-xs text-muted-foreground tabular-nums">{step === "prompt" ? "1" : "2"} / 2</span>
      </div>
    </div>
  );
}

function Result({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!job.prompt) return;
    await navigator.clipboard.writeText(job.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <a href={job.imageUrl!} target="_blank" rel="noreferrer" className="block bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={job.imageUrl!} alt={`Advertising image of ${job.title ?? "your product"}`} className="w-full" />
      </a>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <a href={job.imageUrl!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ExternalLink /> Full size
        </a>
        {job.prompt && (
          <Button variant="ghost" size="sm" onClick={copyPrompt}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy scene prompt"}
          </Button>
        )}
      </div>
    </>
  );
}
