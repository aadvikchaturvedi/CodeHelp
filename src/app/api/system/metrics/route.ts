import { collectMetrics } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await collectMetrics();
    return Response.json(metrics, {
      headers: {
        "Cache-Control": "no-cache, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: {
          code: "METRICS_ERROR",
          message: err instanceof Error ? err.message : "Failed to collect metrics",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
