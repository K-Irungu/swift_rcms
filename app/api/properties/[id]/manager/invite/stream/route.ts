import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { getCurrentUser } from "@/lib/utils/auth";
import inviteEmitter from "@/lib/inviteEmitter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getCurrentUser();
  if (!authUser) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  await connectDB();

  const property = await Property.findOne({ slug: id });
  if (!property) return new Response("Not found", { status: 404 });
  if (property.ownerId.toString() !== authUser.userId) {
    return new Response("Forbidden", { status: 403 });
  }

  const channel = `invite:accepted:${property._id}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let heartbeat: ReturnType<typeof setInterval>;

      const cleanup = () => {
        clearInterval(heartbeat);
        inviteEmitter.off(channel, onAccepted);
      };

      const onAccepted = (data: object) => {
        controller.enqueue(
          encoder.encode(`event: manager-assigned\ndata: ${JSON.stringify(data)}\n\n`),
        );
        cleanup();
        controller.close();
      };

      inviteEmitter.on(channel, onAccepted);

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
