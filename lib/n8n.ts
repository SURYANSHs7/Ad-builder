export type N8nResponse<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export type JobStatus = "prompt" | "photo" | "done" | "failed";

export type Job = {
  status: JobStatus;
  title: string | null;
  prompt: string | null;
  imageUrl: string | null;
  error: string | null;
};

export type Aspect = "square" | "portrait" | "landscape";
export type Style = "auto" | "luxe-dark" | "sunlit" | "minimal-studio" | "nature" | "neon";

export type Progress = {
  level: number;
  title: string;
  xp: number;
  levelXp: number;
  nextXp: number | null;
  nextTitle: string | null;
  credits: number;
  messages: number;
  ads: number;
  streak: number;
  // Shoots started today and the daily cap (2, or more for Pro members).
  shootsToday: number;
  dailyLimit: number;
  pro: boolean;
  // On the Pro waitlist.
  proInterest: boolean;
  email: string | null;
  // The product photo on file, reused for every shoot.
  photo: { url: string; name: string } | null;
  unlocks: { formats: Aspect[]; styles: Style[]; direction: boolean; signature: boolean };
};

export type Brief = { title: string; description: string };

export type ChatMessage = {
  id: number | string;
  role: "user" | "assistant" | "shoot" | "photo";
  // For "shoot" messages this is the jobId, for "photo" messages the image URL.
  text: string;
  brief: Brief | null;
};

export type Ad = { jobId: string; title: string; imageUrl: string; prompt: string; createdAt: string };

export type Me = { progress: Progress; messages: ChatMessage[]; ads: Ad[] };

export type Reward = { progress: Progress; gained?: number; leveledUp?: boolean };

export type ChatReply = Reward & { reply: string; brief: Brief | null };

// Server-only: forwards a request to an n8n webhook with the shared secret.
export async function callWebhook<T>(
  url: string | undefined,
  body: FormData | Record<string, unknown>,
): Promise<{ status: number; body: N8nResponse<T> }> {
  const apiKey = process.env.N8N_API_KEY;
  if (!url || !apiKey) {
    return {
      status: 500,
      body: { success: false, data: null, error: "Server is not configured." },
    };
  }

  const isForm = body instanceof FormData;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: isForm
        ? { "x-api-key": apiKey }
        : { "x-api-key": apiKey, "content-type": "application/json" },
      body: isForm ? body : JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as N8nResponse<T> | null;
    // n8n's own errors (e.g. inactive workflow) don't follow the contract.
    if (typeof json?.success !== "boolean") {
      return {
        status: 502,
        body: { success: false, data: null, error: `Workflow returned ${res.status}.` },
      };
    }
    return { status: res.status, body: json };
  } catch {
    return {
      status: 502,
      body: { success: false, data: null, error: "Could not reach the workflow." },
    };
  }
}
