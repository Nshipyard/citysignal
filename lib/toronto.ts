// Server-side Toronto Open Data client + normalizer.
// Source: Toronto Open Data CKAN datastore_search (public, no key).
// Dataset: Building Permits - Active Permits (202,779 records as of Oct 2026).

const CKAN =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search";
const RESOURCE_ID = "6d0229af-bc54-46de-9c2b-26759b01dd05";
const DATASET_NAME = "building-permits-active-permits";

export interface NormalizedPermit {
  id: string;
  address: string;
  ward: string | null;
  category: string | null;
  status: string | null;
  applied_date: string | null;
  description: string | null;
  source: string;
}

interface RawPermit {
  _id: number;
  PERMIT_NUM?: string;
  REVISION_NUM?: string;
  PERMIT_TYPE?: string;
  STRUCTURE_TYPE?: string;
  WORK?: string;
  STREET_NUM?: string;
  STREET_NAME?: string;
  STREET_TYPE?: string;
  STREET_DIRECTION?: string;
  POSTAL?: string;
  WARD_GRID?: string;
  APPLICATION_DATE?: string;
  STATUS?: string;
  DESCRIPTION?: string;
}

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function buildAddress(r: RawPermit): string {
  const parts = [
    clean(r.STREET_NUM),
    clean(r.STREET_NAME),
    clean(r.STREET_TYPE),
    clean(r.STREET_DIRECTION),
  ].filter(Boolean);
  const street = parts.join(" ");
  const postal = clean(r.POSTAL);
  if (street && postal) return `${street}, Toronto ON ${postal}`;
  if (street) return `${street}, Toronto ON`;
  return "Address not listed";
}

export function normalizePermit(r: RawPermit): NormalizedPermit {
  const permitNum = clean(r.PERMIT_NUM) ?? `row-${r._id}`;
  const rev = clean(r.REVISION_NUM);
  const work = clean(r.WORK);
  const permitType = clean(r.PERMIT_TYPE);
  return {
    id: rev ? `${permitNum} rev ${rev}` : permitNum,
    address: buildAddress(r),
    ward: clean(r.WARD_GRID),
    category: work ?? permitType,
    status: clean(r.STATUS),
    applied_date: clean(r.APPLICATION_DATE),
    description: clean(r.DESCRIPTION),
    source: `toronto-open-data:${DATASET_NAME}`,
  };
}

// Statuses that mean the permit is dead for "upcoming project" purposes.
const INACTIVE_STATUSES = new Set(["abandoned", "revocation pending"]);

export function isActiveStatus(status: string | null): boolean {
  if (!status) return true;
  return !INACTIVE_STATUSES.has(status.trim().toLowerCase());
}

interface SearchParams {
  postalCode?: string;
  status?: string;
  query?: string;
  limit: number;
}

interface CacheEntry {
  at: number;
  payload: unknown;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

async function ckanSearch(
  params: Record<string, string>,
): Promise<{ records: RawPermit[]; total: number }> {
  const url = new URL(CKAN);
  url.searchParams.set("resource_id", RESOURCE_ID);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "citysignal/1.0 (open-source civic data API)" },
  });
  if (!res.ok) throw new Error(`Toronto Open Data returned ${res.status}`);
  const json = (await res.json()) as {
    success: boolean;
    result?: { records: RawPermit[]; total: number };
  };
  if (!json.success || !json.result) throw new Error("Toronto Open Data request failed");
  return { records: json.result.records, total: json.result.total };
}

export interface PermitSearchResult {
  data: NormalizedPermit[];
  meta: {
    total: number;
    limit: number;
    filters: { postal_code: string | null; status: string | null; q: string | null };
    provenance: {
      source: string;
      dataset: string;
      records_total: number;
      cached: boolean;
      cached_at: string | null;
      note: string;
    };
  };
}

export async function searchPermits(p: SearchParams): Promise<PermitSearchResult> {
  const fsa = (p.postalCode ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const statusFilter = (p.status ?? "").trim().toLowerCase();
  const q = (p.query ?? "").trim();
  const limit = Math.min(Math.max(p.limit, 1), 100);

  const cacheKey = JSON.stringify({ fsa, statusFilter, q, limit });
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    const payload = hit.payload as PermitSearchResult;
    return {
      ...payload,
      meta: {
        ...payload.meta,
        provenance: { ...payload.meta.provenance, cached: true, cached_at: new Date(hit.at).toISOString() },
      },
    };
  }

  // CKAN full-text search matches the FSA lexeme inside the POSTAL field.
  // Pull a generous page, then filter precisely in memory.
  const ckanParams: Record<string, string> = { limit: "500" };
  const terms: string[] = [];
  if (fsa) terms.push(fsa);
  if (q) terms.push(q);
  if (terms.length > 0) ckanParams.q = terms.join(" ");

  const { records, total } = await ckanSearch(ckanParams);

  let filtered = records;
  if (fsa) {
    filtered = filtered.filter((r) =>
      (r.POSTAL ?? "").toUpperCase().replace(/\s+/g, "").startsWith(fsa),
    );
  }
  if (statusFilter === "active") {
    filtered = filtered.filter((r) => isActiveStatus(r.STATUS ?? null));
  } else if (statusFilter) {
    filtered = filtered.filter((r) =>
      (r.STATUS ?? "").toLowerCase().includes(statusFilter),
    );
  }

  const data = filtered.slice(0, limit).map(normalizePermit);
  const payload: PermitSearchResult = {
    data,
    meta: {
      total: filtered.length,
      limit,
      filters: {
        postal_code: fsa || null,
        status: p.status?.trim() || null,
        q: q || null,
      },
      provenance: {
        source: "Toronto Open Data (live CKAN query)",
        dataset: DATASET_NAME,
        records_total: total,
        cached: false,
        cached_at: null,
        note: "Records are live from the city's open data portal, cached server-side for 10 minutes. Field names are normalized by citysignal; values are verbatim from the source.",
      },
    },
  };
  cache.set(cacheKey, { at: Date.now(), payload });
  return payload;
}

export async function getPermit(id: string): Promise<NormalizedPermit | null> {
  const permitNum = id.split(" rev ")[0].trim();
  if (!permitNum) return null;
  const { records } = await ckanSearch({
    limit: "10",
    filters: JSON.stringify({ PERMIT_NUM: permitNum }),
  });
  const match =
    records.find((r) => {
      const rev = (r.REVISION_NUM ?? "").trim();
      const full = rev ? `${(r.PERMIT_NUM ?? "").trim()} rev ${rev}` : (r.PERMIT_NUM ?? "").trim();
      return full === id.trim();
    }) ?? records[0];
  return match ? normalizePermit(match) : null;
}
