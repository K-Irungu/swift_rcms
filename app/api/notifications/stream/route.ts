import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/utils/auth";
import { notificationEmitter } from "@/lib/inviteEmitter";

export async function GET(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) return new Response("Unauthorized", { status: 401 });

  const channel = `notification:${authUser.userId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let heartbeat: ReturnType<typeof setInterval>;

      const cleanup = () => {
        clearInterval(heartbeat);
        notificationEmitter.off(channel, onNotification);
      };

      const onNotification = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          cleanup();
        }
      };

      notificationEmitter.on(channel, onNotification);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 20_000);

      req.signal.addEventListener("abort", () => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
