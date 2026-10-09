"use client";

import { useEffect, useState } from "react";
import type { NormalizedPermit } from "@/lib/toronto";

interface SearchMeta {
  total: number;
  limit: number;
  provenance: {
    source: string;
    dataset: string;
    records_total: number;
    cached: boolean;
    cached_at: string | null;
    note: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  "permit issued": "bg-blue-50 text-blue-700 ring-blue-200",
  inspection: "bg-amber-50 text-amber-700 ring-amber-200",
  "issuance pending": "bg-neutral-100 text-neutral-600 ring-neutral-200",
  "examiner's notice sent": "bg-orange-50 text-orange-700 ring-orange-200",
  "revision issued": "bg-violet-50 text-violet-700 ring-violet-200",
  "under review": "bg-neutral-100 text-neutral-600 ring-neutral-200",
  abandoned: "bg-red-50 text-red-700 ring-red-200",
  "revocation pending": "bg-red-50 text-red-700 ring-red-200",
};

function statusStyle(status: string | null): string {
  if (!status) return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return STATUS_STYLES[status.trim().toLowerCase()] ?? "bg-neutral-100 text-neutral-600 ring-neutral-200";
}

function formatDate(d: string | null): string {
  if (!d) return "n/a";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function PermitCard({ p }: { p: NormalizedPermit }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex flex-col rounded-[10px] border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        {p.category && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
            {p.category}
          </span>
        )}
        {p.status && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusStyle(p.status)}`}>
            {p.status}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#0a0a0a]">{p.address}</h3>
      <dl className="mt-3 space-y-1.5 text-[13px] text-neutral-600">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-neutral-400">Applied</dt>
          <dd>{formatDate(p.applied_date)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-neutral-400">Ward</dt>
          <dd>{p.ward ?? "n/a"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-neutral-400">Permit</dt>
          <dd className="font-mono text-xs">{p.id}</dd>
        </div>
      </dl>
      {p.description && (
        <div className="mt-3">
          <p className={`text-[13px] leading-relaxed text-neutral-600 ${open ? "" : "line-clamp-3"}`}>
            {p.description}
          </p>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="mt-1 text-xs font-medium text-[#2563eb] hover:underline"
          >
            {open ? "Show less" : "Read full description"}
          </button>
        </div>
      )}
      <div className="mt-auto pt-4">
        <a
          href={`/api/v1/permits/${encodeURIComponent(p.id)}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-neutral-400 hover:text-[#2563eb]"
        >
          View as JSON
        </a>
      </div>
    </article>
  );
}

function LiveApiPreview() {
  const [json, setJson] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/permits?postal_code=M5V&status=active&limit=1")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const record = j.data?.[0] ?? null;
        setJson(
          JSON.stringify({ data: [record], meta: { total: j.meta?.total ?? null } }, null, 2),
        );
      })
      .catch(() => {
        if (!cancelled) setJson(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="overflow-hidden rounded-[10px] border border-neutral-800 bg-neutral-950 shadow-[0_20px_60px_rgba(10,10,10,0.25)]">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="ml-2 truncate font-mono text-xs text-neutral-400">
          GET /api/v1/permits?postal_code=M5V
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live response
        </span>
      </div>
      <div className="max-h-[380px] overflow-auto p-4">
        {json ? (
          <pre className="w-max min-w-full font-mono text-xs leading-relaxed text-neutral-300">{json}</pre>
        ) : (
          <div className="space-y-2.5" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-neutral-800"
                style={{ width: `${88 - (i % 4) * 14}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-neutral-800 px-4 py-3">
        <a
          href="/api/v1/permits?postal_code=M5V&status=active&limit=1"
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-[#60a5fa] hover:underline"
        >
          Try it in your browser →
        </a>
      </div>
    </div>
  );
}

function PermitRow({ p }: { p: NormalizedPermit }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-0 md:grid-cols-[2fr_1fr_1fr_auto] md:gap-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#0a0a0a]">{p.address}</p>
        <p className="truncate font-mono text-xs text-neutral-400">{p.id}</p>
      </div>
      <p className="hidden text-sm text-neutral-600 md:block">{p.category ?? "n/a"}</p>
      <p className="hidden text-sm text-neutral-600 md:block">{formatDate(p.applied_date)}</p>
      {p.status && (
        <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusStyle(p.status)}`}>
          {p.status}
        </span>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("M5V");
  const [status, setStatus] = useState("active");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NormalizedPermit[] | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setError("Enter a postal code prefix (e.g. M5V) or a street name.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const isPostal = /^[A-Za-z]\d[A-Za-z]?$/.test(q.replace(/\s+/g, ""));
      const params = new URLSearchParams({ limit: "24", status });
      if (isPostal) params.set("postal_code", q);
      else params.set("q", q);
      const res = await fetch(`/api/v1/permits?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `API returned ${res.status}`);
      setResults(json.data);
      setMeta(json.meta);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#2563eb] text-sm font-bold text-white">
              C
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-[#0a0a0a]">citysignal</span>
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
            <a href="#demo" className="hidden hover:text-[#0a0a0a] sm:inline">Demo</a>
            <a href="#api" className="hidden hover:text-[#0a0a0a] sm:inline">API</a>
            <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="hidden hover:text-[#0a0a0a] sm:inline">
              OpenAPI
            </a>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live data
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-10 pt-16 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#2563eb]">
                Toronto open data, normalized
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
                Every building permit, one clean API.
              </h1>
              <p className="mt-5 text-[17px] leading-relaxed text-neutral-600">
                Toronto publishes 202,779 active building permits with 31 inconsistent
                fields. citysignal normalizes them into 8 documented fields and serves
                them live, with the provenance of every record stated up front.
              </p>

              {/* Search */}
              <form
                id="demo"
                onSubmit={runSearch}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Postal code (M5V) or street (King)"
                  aria-label="Postal code or street name"
                  className="h-12 min-h-12 flex-1 rounded-[10px] border border-neutral-300 bg-white px-4 text-[15px] text-[#0a0a0a] placeholder:text-neutral-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  aria-label="Status filter"
                  className="h-12 rounded-[10px] border border-neutral-300 bg-white px-4 text-[15px] text-[#0a0a0a] focus:border-[#2563eb] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="">Any status</option>
                  <option value="Permit Issued">Permit Issued</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Issuance Pending">Issuance Pending</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 shrink-0 rounded-[10px] bg-[#2563eb] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {loading ? "Searching..." : "Search permits"}
                </button>
              </form>

              {/* Provenance badges */}
              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-medium text-neutral-700">
                  Live query against Toronto Open Data
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-medium text-neutral-700">
                  202,779 records in source dataset
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-medium text-neutral-700">
                  Server cache: 10 minutes
                </span>
                {meta && (
                  <span className={`rounded-full px-3 py-1.5 font-medium ${meta.provenance.cached ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {meta.provenance.cached
                      ? `Served from cache${meta.provenance.cached_at ? ` (${new Date(meta.provenance.cached_at).toLocaleTimeString()})` : ""}`
                      : "Fresh from source"}
                  </span>
                )}
              </div>
            </div>
            <LiveApiPreview />
          </div>
        </section>

        {/* Results */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          {error && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {searched && results && meta && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-[#0a0a0a]">{meta.total}</span>{" "}
                  matching permits
                  <span className="text-neutral-400"> · showing {results.length}</span>
                </p>
                <div className="flex rounded-[10px] border border-neutral-200 p-1 text-sm font-medium">
                  {(["cards", "list"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={`rounded-md px-4 py-1.5 capitalize transition-colors ${
                        view === v ? "bg-[#0a0a0a] text-white" : "text-neutral-500 hover:text-[#0a0a0a]"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {results.length === 0 ? (
                <div className="mt-6 rounded-[10px] border border-dashed border-neutral-300 px-6 py-16 text-center">
                  <p className="font-medium text-[#0a0a0a]">No permits match that search.</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Try a different postal code prefix or street name.
                  </p>
                </div>
              ) : view === "cards" ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((p) => (
                    <PermitCard key={p.id} p={p} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-[10px] border border-neutral-200 bg-white">
                  {results.map((p) => (
                    <PermitRow key={p.id} p={p} />
                  ))}
                </div>
              )}
              <p className="mt-6 text-xs leading-relaxed text-neutral-400">
                {meta.provenance.note} Source dataset: {meta.provenance.dataset} ·{" "}
                {meta.provenance.records_total.toLocaleString()} records at query time.
              </p>
            </div>
          )}
          {!searched && !loading && (
            <div className="rounded-[10px] border border-dashed border-neutral-300 px-6 py-16 text-center">
              <p className="font-medium text-[#0a0a0a]">Search above to query the live API.</p>
              <p className="mt-1 text-sm text-neutral-500">
                Every result below comes from Toronto Open Data at request time, not from fixtures.
              </p>
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#2563eb]">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0a0a0a]">The normalization is the product.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Fetch",
                  d: "The API queries the city's CKAN datastore live: 202,779 active permits, 31 raw fields, inconsistent naming and casing throughout.",
                },
                {
                  n: "02",
                  t: "Normalize",
                  d: "Street number, name, type and direction become one address. Statuses collapse into a documented filter. 31 fields become 8, with values verbatim from the source.",
                },
                {
                  n: "03",
                  t: "Serve",
                  d: "A documented REST API with OpenAPI 3.1, a 10-minute server cache, and provenance metadata on every response so agents can cite the source.",
                },
              ].map((s) => (
                <div key={s.n} className="rounded-[10px] border border-neutral-200 bg-white p-6">
                  <p className="font-mono text-xs font-semibold text-[#2563eb]">{s.n}</p>
                  <h3 className="mt-3 text-[15px] font-semibold text-[#0a0a0a]">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API docs */}
        <section id="api" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#2563eb]">API</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0a0a0a]">
            Two endpoints. Full provenance.
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-[10px] border border-neutral-200 bg-white p-6">
              <p className="font-mono text-sm font-semibold text-[#0a0a0a]">
                <span className="text-emerald-600">GET</span> /api/v1/permits
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Search normalized permits by postal code prefix, status, or full-text query.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-[10px] bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-200">
{`curl "https://city.nshipyard.com/api/v1/permits?postal_code=M5V&status=active&limit=5"`}
              </pre>
              <a
                href="/api/v1/permits?postal_code=M5V&status=active&limit=5"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-medium text-[#2563eb] hover:underline"
              >
                Try it live →
              </a>
            </div>
            <div className="min-w-0 rounded-[10px] border border-neutral-200 bg-white p-6">
              <p className="font-mono text-sm font-semibold text-[#0a0a0a]">
                <span className="text-emerald-600">GET</span> /api/v1/permits/{"{id}"}
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                One normalized permit by city permit number.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-[10px] bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-200">
{`curl "https://city.nshipyard.com/api/v1/permits/11%20249370%20BLD"`}
              </pre>
              <a
                href="/api/v1/permits/11%20249370%20BLD"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-medium text-[#2563eb] hover:underline"
              >
                Try it live →
              </a>
            </div>
          </div>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-[10px] border border-neutral-300 px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            OpenAPI 3.1 document
            <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between">
          <p>
            citysignal normalizes Toronto Open Data. Data: City of Toronto, open data licence.
          </p>
          <p>
            Built by{" "}
            <a href="https://github.com/richardsondx" target="_blank" rel="noreferrer" className="font-medium text-[#0a0a0a] hover:text-[#2563eb]">
              Richardson Dackam
            </a>{" "}
            ·{" "}
            <a href="https://x.com/richardsondx" target="_blank" rel="noreferrer" className="hover:text-[#2563eb]">
              @richardsondx
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
