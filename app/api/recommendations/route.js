// app/api/recommendations/route.js
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    if (leads.length > 200) {
      return Response.json(
        { error: "Provide at most 200 leads for analysis" },
        { status: 400 }
      );
    }

    const prompt = `You are a B2B sales operations expert. Analyze these low-quality leads (Tier 3 and Disqualified) that failed to match our ICP, along with our scoring rubric. Identify patterns and return two types of recommendations.

<rubric>
${rubric}
</rubric>

<low_quality_leads>
${JSON.stringify(leads.map(({ tier, score, rationale, disqualifiers, inferred_facts }) => ({
  tier, score, rationale, disqualifiers, inferred_facts
})), null, 2)}
</low_quality_leads>

Return JSON only, no preamble. Match this schema exactly:
{
  "summary": "<one paragraph plain-language summary of the main quality issues in this batch>",
  "sourcing_suggestions": [
    {
      "category": "<e.g. Industry, Company Size, Title, Geography>",
      "finding": "<what pattern you observed, with specifics>",
      "action": "<specific filter to apply in LinkedIn Sales Nav, Apollo, or other list sources>"
    }
  ],
  "rubric_gaps": [
    {
      "type": "new_disqualifier" | "tighten_criteria",
      "finding": "<what pattern suggests a gap in the rubric>",
      "suggested_text": "<exact text to add or change in RUBRIC.md>"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textOutput = response.content[0].text.trim();
    const cleaned = textOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return Response.json(
        { error: "Claude returned invalid JSON", raw: textOutput },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("Recommendations error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
