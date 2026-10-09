---
name: citysignal
description: Normalized Toronto building-permit data over a clean REST API. Use when an agent needs upcoming construction projects, permit activity by postal code or street, or permit details by permit number, without parsing the city's raw 31-field CKAN tables.
---

# citysignal skill

citysignal normalizes Toronto's open building-permit data (202,779 active
records, 31 inconsistent raw fields) into 8 documented fields and serves them
live. Values are verbatim from the City of Toronto; only field names are
normalized.

## Base URL

`https://city.nshipyard.com` (local dev: `http://localhost:3000`). No key.

## Endpoints

### Search permits

`GET /api/v1/permits?postal_code=M5V&status=active&limit=20`

Query params: `postal_code` (forward sortation area prefix, e.g. `M5V`),
`status` (`active` excludes abandoned and revoked permits, or a substring
such as `Permit Issued`), `q` (full-text search over street, description,
builder), `limit` (1-100, default 20).

Response:

```json
{
  "data": [
    {
      "id": "11 249370 BLD rev 00",
      "address": "375 KING ST W, Toronto ON M5V",
      "ward": "S1033",
      "category": "Interior Alterations",
      "status": "Permit Issued",
      "applied_date": "2011-08-02",
      "description": "Interior alterations to ground floor commercial space...",
      "source": "toronto-open-data:building-permits-active-permits"
    }
  ],
  "meta": {
    "total": 497,
    "limit": 20,
    "filters": { "postal_code": "M5V", "status": "active", "q": null },
    "provenance": {
      "source": "Toronto Open Data (live CKAN query)",
      "dataset": "building-permits-active-permits",
      "records_total": 202779,
      "cached": false,
      "cached_at": null,
      "note": "Records are live from the city's open data portal, cached server-side for 10 minutes. Field names are normalized by citysignal; values are verbatim from the source."
    }
  }
}
```

### Get one permit

`GET /api/v1/permits/{id}` - city permit number URL-encoded, e.g.
`/api/v1/permits/11%20249370%20BLD`. Returns `{ "data": { ... } }` or 404.

### Docs

- `GET /api/openapi.json` - OpenAPI 3.1 document (parse this for the full contract).
- `GET /api/health` - service status.

## Provenance rules for agents

- Every response carries `meta.provenance`. Cite `dataset` and whether the
  response was `cached` when you present findings.
- `meta.total` counts matches within the upstream pull (up to 500 records
  per query), not a full-table scan. Say "matching permits found" rather
  than implying exhaustive coverage beyond that.
- A 502 means the city's portal is unreachable; retry later rather than
  treating it as zero results.
