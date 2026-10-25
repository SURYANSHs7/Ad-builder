import { callWebhook, type Progress } from "@/lib/n8n";
import { getUid, noSession } from "@/lib/session";

// The product photo is already stored on the visitor (see /api/photo), so a shoot only sends the brief.
export async function POST(request: Request) {
  const uid = await getUid();
  if (!uid) return noSession();

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return Response.json({ success: false, data: null, error: "Product name is required." }, { status: 400 });
  }

  const payload = new FormData();
  payload.append("uid", uid);
  payload.append("title", title);
  for (const key of ["description", "aspect", "style", "direction"]) {
    payload.append(key, String(body?.[key] ?? "").trim());
  }

  const { status, body: result } = await callWebhook<{ jobId: string; progress: Progress }>(
    process.env.N8N_WEBHOOK_URL,
    payload,
  );
  return Response.json(result, { status });
}
