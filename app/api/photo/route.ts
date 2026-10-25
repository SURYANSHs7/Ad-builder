import { callWebhook, type Reward } from "@/lib/n8n";
import { getUid, noSession } from "@/lib/session";

// Vercel rejects request bodies over 4.5 MB, so cap uploads below that.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function fail(error: string, status = 400) {
  return Response.json({ success: false, data: null, error }, { status });
}

export async function POST(request: Request) {
  const uid = await getUid();
  if (!uid) return noSession();

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return fail("Choose a product photo.");
  if (!photo.type.startsWith("image/")) return fail("Photo must be an image.");
  if (photo.size > MAX_PHOTO_BYTES) return fail("Photo must be under 4 MB.");

  const payload = new FormData();
  payload.append("uid", uid);
  payload.append("photo", photo, photo.name);

  const { status, body } = await callWebhook<Reward>(process.env.N8N_PHOTO_URL, payload);
  return Response.json(body, { status });
}
