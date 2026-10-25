import { callWebhook, type Me } from "@/lib/n8n";
import { getUid, newUid, setUid } from "@/lib/session";

export async function GET() {
  let uid = await getUid();
  if (!uid) {
    uid = newUid();
    await setUid(uid);
  }

  const { status, body } = await callWebhook<Me>(process.env.N8N_ME_URL, { uid });
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
