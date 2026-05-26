import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load the rubric once at module load time
const rubricPath = path.join(process.cwd(), "RUBRIC.md");
const rubric = fs.readFileSync(rubricPath, "utf-8");

export async function POST(request) {
  try {
    const { leads } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return Response.json(
        { error: "Provide a non-empty array of leads" },
        { status: 400 }
      );
    }

    // Score each lead in parallel
    const results = await Promise.all(
      leads.map((lead) => scoreLead(lead))
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Scoring error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function scoreLead(lead) {
  const prompt = `You are scoring an inbound lead against an ICP rubric. Return JSON only, no preamble.

<rubric>
${rubric}
</rubric>

<lead>
Name: ${lead.name || "unknown"}
Email: ${lead.email || "unknown"}
Company: ${lead.company || "unknown"}
Title: ${lead.title || "unknown"}
</lead>
${lead.extra && Object.keys(lead.extra).length > 0
  ? `\n<additional_crm_data>\n${Object.entries(lead.extra).map(([k, v]) => `${k}: ${v}`).join("\n")}\n</additional_crm_data>`
  : ""}
Use the additional CRM data above when provided — it takes precedence over inferred firmographics. For any fields not provided, use your knowledge of B2B SaaS companies to infer where possible. If you don't recognize the company, say so and score conservatively.

Return JSON matching exactly this schema:
{
  "tier": "1" | "2" | "3" | "DQ",
  "score": <integer 0-100>,
  "rationale": "<one sentence explaining the tier>",
  "signals_matched": [<list of ICP criteria matched>],
  "disqualifiers": [<list of DQ criteria triggered, or empty array>],
  "confidence": "high" | "medium" | "low",
  "inferred_facts": {
    "industry": "<best guess>",
    "employee_range": "<best guess>",
    "is_b2b_saas": <true | false | "unknown">
  }
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textOutput = response.content[0].text.trim();

  // Strip markdown code fences if Claude added them
  const cleaned = textOutput
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      input: lead,
      error: "Claude returned invalid JSON",
      raw: textOutput,
    };
  }

  return {
    input: lead,
    ...parsed,
    timestamp: new Date().toISOString(),
  };
}