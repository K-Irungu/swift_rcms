import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { ManagerInvite } from "@/lib/models/ManagerInvite";
import "@/lib/models/User";
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
    async start(controller) {
      const onAccepted = (data: object) => {
        controller.enqueue(
          encoder.encode(`event: manager-assigned\ndata: ${JSON.stringify(data)}\n\n`),
        );
        cleanup();
        controller.close();
      };

      const cleanup = () => {
        clearInterval(heartbeat);
        inviteEmitter.off(channel, onAccepted);
      };

      inviteEmitter.on(channel, onAccepted);

      const stillPending = await ManagerInvite.exists({
        propertyId: property._id,
        status: "PENDING",
        expiresAt: { $gt: new Date() },
      });

      if (!stillPending) {
        const fresh = await Property.findById(property._id)
          .populate<{ propertyManager: { _id: { toString(): string }; fullName: string } | null }>("propertyManager", "_id fullName");

        if (fresh?.propertyManager) {
          onAccepted({
            managerId:   fresh.propertyManager._id.toString(),
            managerName: fresh.propertyManager.fullName,
          });
        } else {
          controller.enqueue(encoder.encode(`event: invite-expired\ndata: {}\n\n`));
          cleanup();
          controller.close();
        }
        return;
      }

      const heartbeat = setInterval(() => {
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
      Connection:      "keep-alive",
    },
  });
}