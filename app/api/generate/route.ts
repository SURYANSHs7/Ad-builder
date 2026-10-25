import { callWebhook, type Progress } from "@/lib/n8n";
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
  if (!form) return fail("Invalid form data.");

  const title = String(form.get("title") ?? "").trim();
  const photo = form.get("photo");

  if (!title) return fail("Product name is required.");
  if (!(photo instanceof File) || photo.size === 0) return fail("Attach a product photo first.");
  if (!photo.type.startsWith("image/")) return fail("Photo must be an image.");
  if (photo.size > MAX_PHOTO_BYTES) return fail("Photo must be under 4 MB.");

  const payload = new FormData();
  payload.append("uid", uid);
  payload.append("title", title);
  for (const key of ["description", "aspect", "style", "direction"]) {
    payload.append(key, String(form.get(key) ?? "").trim());
  }
  payload.append("photo", photo, photo.name);

  const { status, body } = await callWebhook<{ jobId: string; progress: Progress }>(
    process.env.N8N_WEBHOOK_URL,
    payload,
  );
  return Response.json(body, { status });
}
