export async function POST(request) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return Response.json({ error: "WEBHOOK_URL is not configured" }, { status: 400 });
    }

    try {
      const parsed = new URL(webhookUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return Response.json({ error: "WEBHOOK_URL must be an http or https URL" }, { status: 400 });
      }
    } catch {
      return Response.json({ error: "WEBHOOK_URL is not a valid URL" }, { status: 400 });
    }

    const { leads, meta = null } = await request.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return Response.json({ error: "Provide a non-empty array of leads" }, { status: 400 });
    }
    if (leads.length > 500) {
      return Response.json({ error: "Maximum 500 leads per request" }, { status: 400 });
    }

    const whResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads, meta }),
    });

    return Response.json({ ok: whResponse.ok, status: whResponse.status });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
