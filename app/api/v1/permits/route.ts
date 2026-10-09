import { NextRequest } from "next/server";
import { searchPermits } from "@/lib/toronto";

/**
 * GET /api/v1/permits?postal_code=M5V&status=active&limit=20&q=king
 * Normalized Toronto building permits, live from Toronto Open Data.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const postalCode = q.get("postal_code") ?? undefined;
  const status = q.get("status") ?? undefined;
  const query = q.get("q") ?? undefined;
  const limitRaw = q.get("limit");
  const limit = limitRaw === null ? 20 : parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    return Response.json(
      { error: "limit must be an integer between 1 and 100." },
      { status: 400 },
    );
  }
  try {
    const result = await searchPermits({ postalCode, status, query, limit });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upstream data source unavailable." },
      { status: 502 },
    );
  }
}
