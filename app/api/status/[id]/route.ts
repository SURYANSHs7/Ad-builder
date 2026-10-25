import { callWebhook, type Job } from "@/lib/n8n";

export async function GET(_request: Request, ctx: RouteContext<"/api/status/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{24}$/.test(id)) {
    return Response.json({ success: false, data: null, error: "Job not found." }, { status: 404 });
  }

  const { status, body } = await callWebhook<Job>(process.env.N8N_STATUS_URL, { jobId: id });
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
