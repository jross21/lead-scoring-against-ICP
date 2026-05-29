export async function POST(request) {
  try {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) {
      return Response.json({ error: "HUBSPOT_ACCESS_TOKEN is not configured" }, { status: 400 });
    }

    const { leads } = await request.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return Response.json({ error: "Provide a non-empty array of leads" }, { status: 400 });
    }

    const inputs = leads.map((result) => {
      const { name = "", email = "", company = "", title = "" } = result.input ?? {};
      const spaceIdx = name.indexOf(" ");
      const firstname = spaceIdx === -1 ? name : name.slice(0, spaceIdx);
      const lastname = spaceIdx === -1 ? "" : name.slice(spaceIdx + 1);
      return {
        id: email,
        properties: {
          email, firstname, lastname, company, jobtitle: title,
          lead_score: result.score ?? null,
          lead_tier: result.tier ?? null,
        },
      };
    });

    const hsResponse = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ idProperty: "email", inputs }),
      }
    );

    if (!hsResponse.ok) {
      const errBody = await hsResponse.json().catch(() => ({}));
      return Response.json(
        { error: `HubSpot responded with ${hsResponse.status}: ${errBody.message ?? "unknown error"}` },
        { status: 502 }
      );
    }

    const data = await hsResponse.json();
    return Response.json({ pushed: (data.results ?? []).length, errors: data.errors ?? [] });
  } catch (error) {
    console.error("HubSpot push error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
