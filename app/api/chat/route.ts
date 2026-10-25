import { callWebhook, type ChatReply } from "@/lib/n8n";
import { getUid, noSession } from "@/lib/session";

export async function POST(request: Request) {
  const uid = await getUid();
  if (!uid) return noSession();

  const body = await request.json().catch(() => null);
  const text = String(body?.text ?? "").trim();
  if (!text || text.length > 1000) {
    return Response.json(
      { success: false, data: null, error: "Messages must be 1 to 1000 characters." },
      { status: 400 },
    );
  }

  const { status, body: reply } = await callWebhook<ChatReply>(process.env.N8N_CHAT_URL, {
    uid,
    text,
    hasPhoto: body?.hasPhoto === true,
    photoKey: String(body?.photoKey ?? "").slice(0, 200),
  });
  return Response.json(reply, { status });
}
