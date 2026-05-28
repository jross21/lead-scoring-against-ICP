# Search Refinement Recommendations — Design Spec

**Date:** 2026-05-27
**Status:** Approved

## Context

The lead triage app is a one-way scoring tool: it scores leads and exports results, but provides no feedback loop. Users have no way to understand *why* their lists contain so many low-quality leads, or what to change upstream to improve future batches. This feature closes that gap by analyzing patterns in Tier 3 and DQ leads and surfacing two types of guidance: upstream sourcing suggestions (how to filter better at the list-building stage) and rubric gap recommendations (suggested additions to `RUBRIC.md` to catch bad fits earlier).

---

## Architecture

### New endpoint: `/app/api/recommendations/route.js`

- Accepts `POST { leads: ScoredLead[] }` — the caller passes only Tier 3 and DQ leads
- Reads `RUBRIC.md` at request time (same pattern as `/api/score/route.js`)
- Sends leads + rubric to Claude with a structured prompt requesting two outputs
- Returns a single JSON response (no streaming)

**Request body:**
```json
{
  "leads": [ /* Tier 3 + DQ scored leads */ ]
}
```

Each lead already carries: `tier`, `score`, `disqualifiers`, `signals_matched`, `inferred_facts`, `rationale`.

**Response shape:**
```json
{
  "sourcing_suggestions": [
    {
      "category": "string",
      "finding": "string",
      "action": "string"
    }
  ],
  "rubric_gaps": [
    {
      "type": "new_disqualifier" | "tighten_criteria",
      "finding": "string",
      "suggested_text": "string"
    }
  ],
  "summary": "string"
}
```

---

## UI Changes (`app/page.tsx`)

Three additions, no new files:

1. **"Analyze & Recommend" button** — rendered in the results summary bar, visible only after scoring completes and at least one Tier 3 or DQ lead exists. Shows a spinner (`recommendationsLoading`) while the API call is in flight.

2. **Recommendations panel** — rendered below the summary bar, above lead cards. Structure:
   - `summary` paragraph at top
   - Collapsible "Sourcing Suggestions" section: lists each item as `finding` + `action`
   - Collapsible "Rubric Gaps" section: lists each item as `finding` + `suggested_text`

3. **"Download Recommendations" button** — inside the panel; triggers a markdown file download via a new `exportMarkdown(recommendations)` helper added to `lib/exportCsv.ts`.

**New state:**
- `recommendations: RecommendationsResponse | null`
- `recommendationsLoading: boolean`
- `recommendationsError: string | null`

---

## Export Format

The downloaded markdown file renders:

```markdown
# Lead Search Recommendations
Generated: <timestamp>
Batch: <N> Tier 3 + DQ leads analyzed

## Summary
<summary paragraph>

## Sourcing Suggestions
- **<category>**: <finding> → <action>

## Rubric Gaps
- **<type>**: <finding>
  Suggested addition: <suggested_text>
```

---

## Error Handling

- If the API call fails, set `recommendationsError` and show an inline error message with a retry option in the panel area.
- If no Tier 3/DQ leads exist in the batch, the "Analyze & Recommend" button is hidden entirely — no empty-state needed.

---

## Testing

- Unit test the `/api/recommendations` endpoint: valid input, empty leads array, Claude API error, malformed JSON response (same patterns as `/app/api/score/__tests__/route.test.ts`)
- Manual: score a mixed batch, click "Analyze & Recommend", verify both sections render, download the markdown file and confirm formatting
