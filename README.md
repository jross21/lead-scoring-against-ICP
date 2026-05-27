# Lead Scoring Against ICP

Score inbound leads against your ICP rubric using Claude. Upload a CSV from any CRM, get back Tier 1 / Tier 2 / Tier 3 / DQ scores with rationale, matched signals, and disqualifiers — then export the enriched CSV.

LLMs are better at nuanced ICP evaluation than rule-based scoring because they read between the lines of incomplete data. A job title like "Head of People" at a Series B SaaS company means something a keyword match can't capture — it carries context about company stage, HR maturity, and budget authority that no regex will surface. The rubric-in-markdown design keeps scoring logic in version control, editable by anyone on the team without touching code. And it's the exact same artifact the model reads verbatim — what you write is what Claude scores against.

## How it works

1. Upload a CSV export from your CRM — any column structure works
2. The app auto-detects name, email, company, and title columns

   > **Any column not mapped to those four fields is passed to Claude as additional context.** More signal almost always improves accuracy. Claude can weight or ignore extra fields on its own — you don't need to pre-clean your export before uploading. Fields like tech stack, LinkedIn URL, funding round, employee count, and recent activity all sharpen the score without any configuration.

3. Each lead is scored in parallel against the rubric in `RUBRIC.md` using the Claude API
4. Results show tier, score (0–100), confidence, rationale, matched ICP signals, and DQ flags
5. Filter results by tier, then export the enriched CSV with all scoring columns appended to your original data

## Prerequisites

- Node.js 18+
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

## Setup

```bash
git clone https://github.com/jross21/lead-triage
cd lead-triage
npm install
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Output fields

| Field | Description |
|---|---|
| `tier` | `1` (ideal), `2` (workable), `3` (marginal), or `DQ` (disqualified) |
| `score` | 0–100 integer fit score |
| `confidence` | `high`, `medium`, or `low` — reflects data completeness |
| `rationale` | One sentence explaining the tier decision |
| `signals_matched` | ICP criteria the lead met |
| `disqualifiers` | DQ criteria triggered (empty if none) |
| `inferred_facts` | Industry, employee range, and B2B SaaS flag inferred by Claude |

DQ is a first-class tier, not a consolation bucket. Knowing who not to pursue is as valuable as knowing who to pursue — it prevents wasted outreach, not just failed outreach.

## Choosing a model

The model is a one-line change in `app/api/score/route.js`. Three options:

- `claude-haiku-4-5` — Fastest, roughly 1/5 the cost of Sonnet. Good for high-volume pre-screening passes when budget is the constraint.
- `claude-sonnet-4-5` (default) — Strong reasoning, reasonable cost. Right for most lists.
- `claude-opus-4-7` — Highest reasoning quality. Worth it when the list is small and a misclassified lead has real downstream cost — roughly 5x Sonnet pricing.

`max_tokens` is set to 1024, which is deliberately conservative. The JSON response rarely exceeds 400 tokens. The cost driver is input tokens (rubric + lead data), not output.

## Writing scored leads back to your CRM

This tool scores locally and produces an enriched CSV. To push scores back to a CRM:

- **Via API**: Most CRMs (HubSpot, Salesforce, Pipedrive, Attio) expose REST upsert endpoints. Match on email to update the right contact. The four output columns — `tier`, `score`, `confidence`, `rationale` — map cleanly to custom CRM properties.
- **Via automation**: Zapier, Make, or n8n can watch for new CSV files or webhook triggers and write to CRM fields — no code required.
- **Direct in the scoring route**: Extend `app/api/score/route.js` to call the CRM API directly after scoring each batch. The output is already structured for this.

CRM auth and field mapping are too organization-specific to bake into a general tool — that's why it's not built in.

## Customizing the ICP

Edit `RUBRIC.md` to change the scoring criteria. The rubric lives in a markdown file so scoring criteria stay in version control, readable by humans without running the app, and editable without touching code or redeploying. The app reads this file at startup and sends it verbatim to Claude with each lead — no code changes needed.

The default rubric is built for a US-based HR benefits and wellness platform targeting 100–2,500 employee companies.
