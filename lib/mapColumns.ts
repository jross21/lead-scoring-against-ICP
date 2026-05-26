export type ColumnMap = {
  name: string | [string, string] | null;
  email: string | null;
  company: string | null;
  title: string | null;
  extra: string[];
};

export type MappedLead = {
  name: string;
  email: string;
  company: string;
  title: string;
  extra: Record<string, string>;
};

const NAME_VARIANTS = ["name", "full name", "fullname", "contact name", "lead name"];
const FIRST_NAME_VARIANTS = ["first name", "firstname", "first"];
const LAST_NAME_VARIANTS = ["last name", "lastname", "last", "surname"];
const EMAIL_VARIANTS = ["email", "email address", "work email", "business email", "e-mail"];
const COMPANY_VARIANTS = ["company", "company name", "organization", "organisation", "org", "account", "account name"];
const TITLE_VARIANTS = ["title", "job title", "jobtitle", "position", "role", "job role", "designation"];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function mapColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(normalize);
  const map: ColumnMap = { name: null, email: null, company: null, title: null, extra: [] };
  const claimed = new Set<number>();

  // Detect first + last name pair before checking for a single name field
  const firstIdx = normalized.findIndex((h) => FIRST_NAME_VARIANTS.includes(h));
  const lastIdx = normalized.findIndex((h) => LAST_NAME_VARIANTS.includes(h));

  if (firstIdx !== -1 && lastIdx !== -1) {
    map.name = [headers[firstIdx], headers[lastIdx]];
    claimed.add(firstIdx);
    claimed.add(lastIdx);
  } else {
    const nameIdx = normalized.findIndex((h) => NAME_VARIANTS.includes(h));
    if (nameIdx !== -1) {
      map.name = headers[nameIdx];
      claimed.add(nameIdx);
    } else if (firstIdx !== -1) {
      map.name = headers[firstIdx];
      claimed.add(firstIdx);
    }
  }

  const emailIdx = normalized.findIndex((h) => EMAIL_VARIANTS.includes(h));
  if (emailIdx !== -1) { map.email = headers[emailIdx]; claimed.add(emailIdx); }

  const companyIdx = normalized.findIndex((h) => COMPANY_VARIANTS.includes(h));
  if (companyIdx !== -1) { map.company = headers[companyIdx]; claimed.add(companyIdx); }

  const titleIdx = normalized.findIndex((h) => TITLE_VARIANTS.includes(h));
  if (titleIdx !== -1) { map.title = headers[titleIdx]; claimed.add(titleIdx); }

  headers.forEach((h, i) => {
    if (!claimed.has(i)) map.extra.push(h);
  });

  return map;
}

export function applyMap(row: Record<string, string>, map: ColumnMap): MappedLead {
  let name = "";
  if (Array.isArray(map.name)) {
    const [firstHeader, lastHeader] = map.name;
    name = [row[firstHeader], row[lastHeader]].filter(Boolean).join(" ");
  } else if (map.name) {
    name = row[map.name] ?? "";
  }

  const extra: Record<string, string> = {};
  for (const h of map.extra) {
    if (row[h] !== undefined && row[h] !== "") extra[h] = row[h];
  }

  return {
    name,
    email: (map.email ? row[map.email] : "") ?? "",
    company: (map.company ? row[map.company] : "") ?? "",
    title: (map.title ? row[map.title] : "") ?? "",
    extra,
  };
}
