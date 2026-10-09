import { NextRequest } from "next/server";
import { getPermit } from "@/lib/toronto";

/** GET /api/v1/permits/{id} - one normalized permit by permit number. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  try {
    const permit = await getPermit(decoded);
    if (!permit) {
      return Response.json({ error: `No permit found with id "${decoded}".` }, { status: 404 });
    }
    return Response.json({ data: permit });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upstream data source unavailable." },
      { status: 502 },
    );
  }
}
