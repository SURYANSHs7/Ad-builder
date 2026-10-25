"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import type { Brief, ChatMessage, ChatReply, N8nResponse, Progress, Reward } from "@/lib/n8n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BriefCard } from "@/components/brief-card";
import { ShotCard } from "@/components/shot-card";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const STARTERS = [
  "I sell a cologne and need an Instagram ad",
  "Make my sneakers look premium",
  "What can you do for my brand?",
];

type Message = ChatMessage & { photoUrl?: string };
type Photo = { file: File; url: string; key: string };

type Props = {
  initialMessages: ChatMessage[];
  progress: Progress;
  gain: { amount: number; id: number } | null;
  onReward: (r: Reward) => void;
  onShootFinished: () => void;
  onMerged: () => void;
};

export function Chat({ initialMessages, progress, gain, onReward, onShootFinished, onMerged }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoSent, setPhotoSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const localId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  // The newest brief stays actionable until it has been shot.
  const lastShoot = messages.findLastIndex((m) => m.role === "shoot");
  const activeBrief = messages.findLastIndex((m, i) => m.role === "assistant" && m.brief && i > lastShoot);

  function push(m: Omit<Message, "id">) {
    const message = { ...m, id: `local-${localId.current++}` };
    setMessages((prev) => [...prev, message]);
    return message.id;
  }

  async function send(raw: string) {
    const attachNow = photo && !photoSent ? photo : null;
    const body = raw.trim() || (attachNow ? "Here's my product photo." : "");
    if (!body || sending) return;

    setSending(true);
    setError(null);
    setText("");
    const id = push({ role: "user", text: body, brief: null, photoUrl: attachNow?.url });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body, hasPhoto: photo !== null, photoKey: photo?.key ?? "" }),
      });
      const json = (await res.json()) as N8nResponse<ChatReply>;
      if (json.data?.progress) onReward(json.data);
      if (!json.success || !json.data?.reply) throw new Error(json.error ?? "Something went wrong.");
      if (attachNow) setPhotoSent(true);
      push({ role: "assistant", text: json.data.reply, brief: json.data.brief });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setText(body);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Photo must be an image.");
    if (file.size > MAX_PHOTO_BYTES) return setError("Photo must be under 4 MB.");
    setError(null);
    setPhoto({ file, url: URL.createObjectURL(file), key: `${file.name}-${file.size}` });
    setPhotoSent(false);
  }

  function onShot(jobId: string, brief: Brief | null) {
    push({ role: "shoot", text: jobId, brief });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-4 py-10 sm:px-6">
          {messages.length === 0 && !sending ? (
            <Welcome onPick={send} />
          ) : (
            messages.map((m, i) =>
              m.role === "shoot" ? (
                <ShotCard key={m.id} jobId={m.text} brief={m.brief} onFinished={onShootFinished} />
              ) : (
                <div key={m.id} className="flex flex-col gap-4">
                  <Bubble message={m} />
                  {m.brief && i === activeBrief && (
                    <BriefCard
                      brief={m.brief}
                      progress={progress}
                      photo={photo?.file ?? null}
                      onAttach={() => fileRef.current?.click()}
                      onShot={(jobId) => onShot(jobId, m.brief)}
                      onReward={onReward}
                      onMerged={onMerged}
                    />
                  )}
                </div>
              ),
            )
          )}
          {sending && <Typing />}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[680px] px-4 pb-4 sm:px-6 sm:pb-6">
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition focus-within:border-foreground/30"
        >
          {photo && (
            <div className="flex items-center gap-3 border-b px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="size-10 rounded-md border object-cover" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-medium">{photo.file.name}</p>
                <p className="text-muted-foreground">{photoSent ? "Product photo, ready to shoot" : "Sends with your next message"}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove photo" onClick={() => { setPhoto(null); setPhotoSent(false); }}>
                <X />
              </Button>
            </div>
          )}
          <div className="flex items-end gap-1.5 p-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Attach product photo" onClick={() => fileRef.current?.click()}>
              <Paperclip />
            </Button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(text);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Tell the art director about your product…"
              aria-label="Message"
              className="max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none [field-sizing:content] placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={sending || (!text.trim() && !(photo && !photoSent))}>
              <ArrowUp />
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onPick} />
        </form>
        <div className="mt-2 flex h-4 items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>Enter to send, Shift + Enter for a new line</span>
          {gain && gain.amount > 0 && (
            <span key={gain.id} className="animate-rise font-medium text-signal tabular-nums">
              +{gain.amount} XP
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2">
        {message.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.photoUrl} alt="Your product photo" className="max-h-48 rounded-xl border object-cover" />
        )}
        <p className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
      </div>
    );
  }
  return (
    <div className="animate-rise">
      <Label />
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
    </div>
  );
}

function Label() {
  return <p className="mb-1.5 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Art director</p>;
}

function Typing() {
  return (
    <div aria-live="polite" aria-label="The art director is typing">
      <Label />
      <span className="flex gap-1 py-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-develop rounded-full bg-foreground/50" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </span>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-6 pt-[8vh]">
      <div>
        <h1 className="font-heading text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.05] tracking-tight">
          Tell us what you&apos;re selling.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Our art director asks a few questions, then shoots a campaign image of your product, right here. Every good
          message earns XP toward free shoots and new formats.
        </p>
      </div>
      <ul className="flex flex-col border-t">
        {STARTERS.map((s) => (
          <li key={s} className="border-b">
            <button
              type="button"
              onClick={() => onPick(s)}
              className={cn(
                "group flex w-full items-center justify-between gap-4 py-3.5 text-left text-[15px] transition",
                "hover:pl-1 focus-visible:outline-none focus-visible:pl-1",
              )}
            >
              {s}
              <ArrowUp className="size-4 rotate-45 text-muted-foreground transition group-hover:text-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
