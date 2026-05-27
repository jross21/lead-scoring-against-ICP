# Lead Scoring Against ICP

Score inbound leads against your ICP rubric using Claude. Upload a CSV from any CRM, get back Tier 1 / Tier 2 / Tier 3 / DQ scores with rationale, matched signals, and disqualifiers — then export the enriched CSV.

## How it works

1. Upload a CSV export from your CRM (any column structure)
2. The app auto-detects name, email, company, and title columns — extra columns are passed to Claude as additional context
3. Each lead is scored in parallel against the rubric in `RUBRIC.md` using the Claude API
4. Results show tier, score (0–100), confidence, rationale, matched ICP signals, and DQ flags
5. Export the enriched CSV with all scoring columns appended to your original data

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

## Customizing the ICP

Edit `RUBRIC.md` to change the scoring criteria. The app reads this file at startup and sends it verbatim to Claude with each lead — no code changes needed.

The default rubric is built for a US-based HR benefits and wellness platform targeting 100–2,500 employee companies.
