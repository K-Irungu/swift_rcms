import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Expense } from "@/lib/models/Expense";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveAndAuthorize(slug: string) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const property = await Property.findOne({ slug }, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  if (!isOwner && !isManager) return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const, property };
}

// ─── DELETE — remove an expense ──────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  try {
    const { id, expenseId } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const expense = await Expense.findOneAndDelete({
      _id:        expenseId,
      propertyId: auth.property._id,
    });

    if (!expense) return errorResponse("Expense not found", 404);

    return successResponse(null, "Expense deleted");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete expense",
      500,
    );
  }
}
