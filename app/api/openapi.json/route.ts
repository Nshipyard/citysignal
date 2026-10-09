/** GET /api/openapi.json - OpenAPI 3.1 document for the citysignal API. */
export async function GET() {
  const doc = {
    openapi: "3.1.0",
    info: {
      title: "citysignal API",
      version: "1.0.0",
      description:
        "Normalized Toronto municipal open data. v1 serves building permits from the city's live open data portal; field names are normalized by citysignal and values are verbatim from the source.",
      license: { name: "MIT" },
    },
    servers: [{ url: "/api/v1", description: "citysignal v1" }],
    paths: {
      "/permits": {
        get: {
          summary: "Search normalized building permits",
          parameters: [
            {
              name: "postal_code",
              in: "query",
              description: "Forward sortation area prefix, e.g. M5V. Matches the start of the postal code.",
              schema: { type: "string" },
            },
            {
              name: "status",
              in: "query",
              description:
                "Status filter. Use 'active' for permits that are not abandoned or revoked, or a substring such as 'Permit Issued'.",
              schema: { type: "string" },
            },
            {
              name: "q",
              in: "query",
              description: "Full-text search across the source record (street name, description, builder).",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              description: "Max records returned, 1 to 100. Default 20.",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Ranked permit list with provenance metadata.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PermitList" },
                },
              },
            },
            "400": { description: "Invalid limit parameter." },
            "502": { description: "Toronto Open Data portal unreachable." },
          },
        },
      },
      "/permits/{id}": {
        get: {
          summary: "Get one normalized permit by id",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Permit number as issued by the city, e.g. '11 249370 BLD'.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "The normalized permit.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Permit" },
                },
              },
            },
            "404": { description: "No permit with that id." },
            "502": { description: "Toronto Open Data portal unreachable." },
          },
        },
      },
    },
    components: {
      schemas: {
        Permit: {
          type: "object",
          required: ["id", "address", "source"],
          properties: {
            id: { type: "string", description: "City permit number (plus revision when present)." },
            address: { type: "string", description: "Normalized street address, Toronto ON." },
            ward: { type: "string", nullable: true, description: "City ward grid code." },
            category: { type: "string", nullable: true, description: "Type of work, verbatim from the source." },
            status: { type: "string", nullable: true, description: "Permit status, verbatim from the source." },
            applied_date: { type: "string", nullable: true, format: "date", description: "Application date." },
            description: { type: "string", nullable: true, description: "Work description, verbatim from the source." },
            source: { type: "string", description: "Upstream dataset identifier." },
          },
        },
        PermitList: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Permit" } },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer" },
                limit: { type: "integer" },
                filters: { type: "object" },
                provenance: {
                  type: "object",
                  properties: {
                    source: { type: "string" },
                    dataset: { type: "string" },
                    records_total: { type: "integer" },
                    cached: { type: "boolean" },
                    cached_at: { type: "string", nullable: true },
                    note: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  return Response.json(doc);
}
