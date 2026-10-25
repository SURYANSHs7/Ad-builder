import { callWebhook, type Reward } from "@/lib/n8n";
import { getUid, noSession, setUid } from "@/lib/session";

type EmailResult = Reward & { sent?: boolean; mergedUid?: string | null };

export async function POST(request: Request) {
  const uid = await getUid();
  if (!uid) return noSession();

  const body = await request.json().catch(() => null);
  const action = body?.action === "verify" ? "verify" : "start";

  const { status, body: result } = await callWebhook<EmailResult>(process.env.N8N_EMAIL_URL, {
    uid,
    action,
    email: String(body?.email ?? ""),
    code: String(body?.code ?? ""),
  });

  // The email already belongs to a verified visitor: continue as them.
  const merged = result.data?.mergedUid;
  if (result.success && merged && /^[a-z0-9]{24}$/.test(merged)) await setUid(merged);

  return Response.json(result, { status });
}
