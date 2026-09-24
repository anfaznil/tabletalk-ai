/**
 * GET /api/orders/stream
 * Server-Sent Events — pushes new orders to the Kitchen Tablet in real-time.
 * Sends a heartbeat every 25 s so proxies don't close the connection.
 */

import { NextResponse } from "next/server";
import { subscribe } from "@/lib/kitchen/event-bus";
import { getRestaurantId } from "@/lib/store/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const restaurantId = await getRestaurantId();

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

      unsubscribe = subscribe(restaurantId, (order) => {
        try {
          controller.enqueue(
            encoder.encode(`event: new_order\ndata: ${JSON.stringify(order)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
      clearInterval(heartbeat);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
