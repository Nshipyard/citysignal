/** GET /api/health - service status. */
export async function GET() {
  return Response.json({
    ok: true,
    service: "citysignal",
    version: "1.0.0",
    upstream: "Toronto Open Data CKAN (building-permits-active-permits)",
    time: new Date().toISOString(),
  });
}
