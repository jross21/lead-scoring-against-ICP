import { mapColumns, applyMap, type ColumnMap } from "@/lib/mapColumns";
import type { ScoringResult, InferredFacts } from "@/lib/types";

// A realistic CRM export: original columns include extras (Employees, Funding,
// Industry, HQ) that flow to Claude as additional signal. Authored to span the
// HR-benefits ICP in RUBRIC.md so the demo dashboard shows a believable spread.

type ScoreMeta = {
  tier: string;
  score: number;
  confidence: "high" | "medium" | "low";
  rationale: string;
  signals_matched: string[];
  disqualifiers: string[];
  inferred_facts: InferredFacts;
};

type SampleRow = Record<string, string>;

const COLUMNS = [
  "First Name",
  "Last Name",
  "Email",
  "Company",
  "Title",
  "Employees",
  "Funding Stage",
  "Industry",
  "HQ Location",
] as const;

const RAW: { row: SampleRow; meta: ScoreMeta }[] = [
  // ---- Tier 1 ----
  {
    row: r("Maya", "Chen", "maya.chen@brightwave.io", "Brightwave Analytics", "VP of People", "420", "Series C", "B2B SaaS", "Austin, TX (remote-first)"),
    meta: {
      tier: "1", score: 93, confidence: "high",
      rationale: "US remote-first SaaS at 420 employees with a VP of People and recent growth funding — squarely in the sweet spot.",
      signals_matched: ["US-headquartered", "150–800 employees", "VP of People present", "Remote-first workforce", "Series A or later", "SaaS/Tech vertical"],
      disqualifiers: [],
      inferred_facts: { industry: "B2B SaaS", employee_range: "400–500", is_b2b_saas: true },
    },
  },
  {
    row: r("Daniel", "Okoro", "dokoro@northloop.com", "Northloop Health", "Chief People Officer", "610", "Series B", "Healthtech", "Boston, MA"),
    meta: {
      tier: "1", score: 90, confidence: "high",
      rationale: "Multi-state healthtech with a CPO and 610 employees fits the ideal benefits-modernization buyer.",
      signals_matched: ["US-headquartered", "150–800 employees", "Chief People Officer present", "Multi-state workforce", "Series A or later", "Healthtech vertical"],
      disqualifiers: [],
      inferred_facts: { industry: "Healthtech", employee_range: "600–700", is_b2b_saas: true },
    },
  },
  {
    row: r("Priya", "Raman", "priya@ledgerline.com", "Ledgerline", "Director of People Ops", "280", "Series B", "Fintech", "New York, NY (hybrid)"),
    meta: {
      tier: "1", score: 88, confidence: "high",
      rationale: "Series B fintech at 280 employees with a dedicated People Ops director and distributed teams.",
      signals_matched: ["US-headquartered", "150–800 employees", "People Ops leader present", "Multi-state workforce", "Series A or later", "Financial Services vertical"],
      disqualifiers: [],
      inferred_facts: { industry: "Financial Services", employee_range: "250–300", is_b2b_saas: true },
    },
  },
  {
    row: r("Sofia", "Mendes", "sofia.mendes@craftbase.dev", "Craftbase", "Head of People", "190", "Series A", "Developer Tools", "Denver, CO (remote-first)"),
    meta: {
      tier: "1", score: 86, confidence: "medium",
      rationale: "Remote-first dev-tools company at 190 employees with a Head of People; funding confirms budget for discretionary HR spend.",
      signals_matched: ["US-headquartered", "150–800 employees", "People function present", "Remote-first workforce", "Series A or later", "SaaS/Tech vertical"],
      disqualifiers: [],
      inferred_facts: { industry: "Developer Tools", employee_range: "150–200", is_b2b_saas: true },
    },
  },

  // ---- Tier 2 ----
  {
    row: r("Aaron", "Whitfield", "aaron@summitmedia.co", "Summit Media Group", "HR Manager", "95", "Profitable", "Marketing Agency", "Chicago, IL"),
    meta: {
      tier: "2", score: 71, confidence: "medium",
      rationale: "Sub-100 marketing agency with a single HR manager — workable but below the employee sweet spot and HR function is early-stage.",
      signals_matched: ["US-headquartered", "Marketing Agency vertical", "Profitable / self-sustaining"],
      disqualifiers: [],
      inferred_facts: { industry: "Marketing Agency", employee_range: "90–100", is_b2b_saas: false },
    },
  },
  {
    row: r("Lena", "Petrov", "lena.petrov@cargowise.us", "Cargowise Logistics", "People Operations Manager", "1400", "Series D", "Logistics-Tech", "Seattle, WA"),
    meta: {
      tier: "2", score: 68, confidence: "medium",
      rationale: "Large logistics-tech firm in an adjacent vertical; viable but procurement friction is likely at 1,400 employees.",
      signals_matched: ["US-headquartered", "People Ops function present", "Adjacent talent-competitive industry"],
      disqualifiers: [],
      inferred_facts: { industry: "Logistics-Tech", employee_range: "1,300–1,500", is_b2b_saas: true },
    },
  },
  {
    row: r("Marcus", "Hale", "mhale@brightschool.org", "Brightschool", "HR Generalist", "240", "Series A", "Education-Tech", "Remote (US)"),
    meta: {
      tier: "2", score: 66, confidence: "medium",
      rationale: "Edtech at 240 employees but HR is a single generalist; strong if a senior People hire follows.",
      signals_matched: ["US-headquartered", "150–800 employees", "Education-Tech adjacent vertical", "Series A or later"],
      disqualifiers: [],
      inferred_facts: { industry: "Education-Tech", employee_range: "200–250", is_b2b_saas: true },
    },
  },
  {
    row: r("Yuki", "Tanaka", "ytanaka@shopfront.com", "Shopfront", "Office Manager", "130", "Series A", "E-commerce", "Portland, OR (hybrid)"),
    meta: {
      tier: "2", score: 61, confidence: "low",
      rationale: "E-commerce company transitioning to hybrid, but HR is handled by an office manager — buying committee is unclear.",
      signals_matched: ["US-headquartered", "Expanding to hybrid"],
      disqualifiers: [],
      inferred_facts: { industry: "E-commerce", employee_range: "120–150", is_b2b_saas: false },
    },
  },
  {
    row: r("Grace", "Olsen", "grace@meridianconsulting.com", "Meridian Consulting", "Benefits Coordinator", "330", "Profitable", "Professional Services", "Atlanta, GA"),
    meta: {
      tier: "2", score: 70, confidence: "medium",
      rationale: "Professional-services firm with an explicit benefits role; lacks a senior People leader to champion the purchase.",
      signals_matched: ["US-headquartered", "150–800 employees", "Professional Services vertical", "Benefits function present"],
      disqualifiers: [],
      inferred_facts: { industry: "Professional Services", employee_range: "300–350", is_b2b_saas: false },
    },
  },
  {
    row: r("Tom", "Becker", "tom.becker@forgeworks.io", "Forgeworks", "Founder & CEO", "70", "Seed", "B2B SaaS", "Salt Lake City, UT (remote)"),
    meta: {
      tier: "2", score: 58, confidence: "low",
      rationale: "Remote SaaS but only 70 employees with founder-led HR and seed-stage budget — borderline on size and spend.",
      signals_matched: ["US-headquartered", "Remote workforce", "SaaS/Tech vertical"],
      disqualifiers: [],
      inferred_facts: { industry: "B2B SaaS", employee_range: "50–80", is_b2b_saas: true },
    },
  },

  // ---- Tier 3 ----
  {
    row: r("Helen", "Ward", "hward@quietspring.com", "Quietspring", "Operations Lead", "55", "Bootstrapped", "Professional Services", "Nashville, TN"),
    meta: {
      tier: "3", score: 41, confidence: "low",
      rationale: "Just above the DQ floor at 55 employees with no HR function and bootstrapped budget — marginal fit.",
      signals_matched: ["US-headquartered"],
      disqualifiers: [],
      inferred_facts: { industry: "Professional Services", employee_range: "50–60", is_b2b_saas: false },
    },
  },
  {
    row: r("Raj", "Patel", "raj@unknownco.com", "Unknown Co", "Manager", "", "", "", ""),
    meta: {
      tier: "3", score: 35, confidence: "low",
      rationale: "Almost no firmographic data and an unrecognized company; scored conservatively per the rubric.",
      signals_matched: [],
      disqualifiers: [],
      inferred_facts: { industry: "unknown", employee_range: "unknown", is_b2b_saas: "unknown" },
    },
  },
  {
    row: r("Bianca", "Russo", "bianca@stoneandoak.com", "Stone & Oak", "Store Operations", "120", "Profitable", "Retail", "Columbus, OH"),
    meta: {
      tier: "3", score: 38, confidence: "medium",
      rationale: "Brick-and-mortar retail with in-office hourly workforce — limited distributed-benefits pain and no People Ops contact.",
      signals_matched: ["US-headquartered"],
      disqualifiers: [],
      inferred_facts: { industry: "Retail", employee_range: "100–150", is_b2b_saas: false },
    },
  },
  {
    row: r("Owen", "Frost", "owen.frost@hardlinemfg.com", "Hardline Manufacturing", "Plant HR Lead", "780", "Profitable", "Manufacturing", "Toledo, OH"),
    meta: {
      tier: "3", score: 44, confidence: "medium",
      rationale: "Manufacturing with a largely on-site workforce; outside target verticals and weak fit for flexible wellness perks.",
      signals_matched: ["US-headquartered", "HR function present"],
      disqualifiers: [],
      inferred_facts: { industry: "Manufacturing", employee_range: "700–800", is_b2b_saas: false },
    },
  },
  {
    row: r("Carla", "Nunez", "cnunez@driftlabs.com", "Drift Labs", "Recruiter", "160", "Series A", "Biotech", "San Diego, CA"),
    meta: {
      tier: "3", score: 47, confidence: "low",
      rationale: "Right size but a lab-based biotech workforce and a recruiting (not benefits) contact make this a marginal fit.",
      signals_matched: ["US-headquartered", "150–800 employees", "Series A or later"],
      disqualifiers: [],
      inferred_facts: { industry: "Biotech", employee_range: "150–200", is_b2b_saas: false },
    },
  },
  {
    row: r("Victor", "Sloan", "vsloan@parkerhold.com", "Parker Holdings", "Administrator", "210", "Profitable", "Real Estate", "Phoenix, AZ"),
    meta: {
      tier: "3", score: 40, confidence: "medium",
      rationale: "Real-estate holding company outside target verticals with an in-office, low-turnover workforce.",
      signals_matched: ["US-headquartered", "150–800 employees"],
      disqualifiers: [],
      inferred_facts: { industry: "Real Estate", employee_range: "200–250", is_b2b_saas: false },
    },
  },

  // ---- Disqualified ----
  {
    row: r("Emma", "Lindqvist", "emma@nordapp.se", "Nordapp", "Head of People", "260", "Series B", "B2B SaaS", "Stockholm, Sweden"),
    meta: {
      tier: "DQ", score: 12, confidence: "high",
      rationale: "Strong profile on paper but headquartered outside the US, which the platform does not support.",
      signals_matched: ["150–800 employees", "People function present"],
      disqualifiers: ["Outside the United States"],
      inferred_facts: { industry: "B2B SaaS", employee_range: "250–300", is_b2b_saas: true },
    },
  },
  {
    row: r("Jordan", "Riley", "jordan.riley88@gmail.com", "Self-employed", "Consultant", "1", "", "Consulting", "Miami, FL"),
    meta: {
      tier: "DQ", score: 5, confidence: "high",
      rationale: "Personal email domain and a one-person operation — not a real business buyer.",
      signals_matched: [],
      disqualifiers: ["Personal email domain", "Fewer than 50 employees"],
      inferred_facts: { industry: "Consulting", employee_range: "1", is_b2b_saas: false },
    },
  },
  {
    row: r("Nadia", "Brooks", "nbrooks@globalign.com", "Globalign", "CHRO", "8200", "Public", "Enterprise Software", "San Jose, CA"),
    meta: {
      tier: "DQ", score: 18, confidence: "high",
      rationale: "Over 8,000 employees with deeply embedded enterprise HR systems; displacement is impractical.",
      signals_matched: ["US-headquartered", "CHRO present"],
      disqualifiers: ["Over 2,500 employees"],
      inferred_facts: { industry: "Enterprise Software", employee_range: "8,000+", is_b2b_saas: true },
    },
  },
  {
    row: r("Caleb", "Moore", "caleb@snackdrop.com", "Snackdrop", "Growth Lead", "340", "Series B", "Consumer Marketplace", "Los Angeles, CA"),
    meta: {
      tier: "DQ", score: 15, confidence: "high",
      rationale: "B2C consumer marketplace with no HR/People buying committee that maps to the product.",
      signals_matched: ["US-headquartered"],
      disqualifiers: ["B2C / consumer marketplace"],
      inferred_facts: { industry: "Consumer Marketplace", employee_range: "300–400", is_b2b_saas: false },
    },
  },
];

function r(
  first: string,
  last: string,
  email: string,
  company: string,
  title: string,
  employees: string,
  funding: string,
  industry: string,
  hq: string
): SampleRow {
  return {
    "First Name": first,
    "Last Name": last,
    Email: email,
    Company: company,
    Title: title,
    Employees: employees,
    "Funding Stage": funding,
    Industry: industry,
    "HQ Location": hq,
  };
}

export const SAMPLE_FILE_NAME = "sample-crm-export.csv";

export const SAMPLE_RAW_ROWS: SampleRow[] = RAW.map((e) => e.row);

export const SAMPLE_COLUMN_MAP: ColumnMap = mapColumns([...COLUMNS]);

export const SAMPLE_RESULTS: ScoringResult[] = RAW.map((e) => ({
  input: applyMap(e.row, SAMPLE_COLUMN_MAP),
  ...e.meta,
  timestamp: "2026-05-31T00:00:00.000Z",
}));

export const SAMPLE_LEADS = SAMPLE_RESULTS.map((r) => r.input);
