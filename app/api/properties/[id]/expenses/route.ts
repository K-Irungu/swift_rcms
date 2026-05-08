import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Property from "@/lib/models/Property";
import { Expense, EXPENSE_CATEGORIES } from "@/lib/models/Expense";
import { getCurrentUser } from "@/lib/utils/auth";
import { successResponse, errorResponse } from "@/lib/utils/ApiResponse";

async function resolveAndAuthorize(slug: string, ownerOnly = false) {
  const authUser = await getCurrentUser();
  if (!authUser) return { ok: false as const, res: errorResponse("Unauthorized", 401) };

  await connectDB();

  const property = await Property.findOne({ slug }, { _id: 1, ownerId: 1, propertyManager: 1 });
  if (!property) return { ok: false as const, res: errorResponse("Property not found", 404) };

  const isOwner   = String(property.ownerId) === authUser.userId;
  const isManager = property.propertyManager && String(property.propertyManager) === authUser.userId;
  const allowed   = ownerOnly ? isOwner : (isOwner || !!isManager);
  if (!allowed) return { ok: false as const, res: errorResponse("Forbidden", 403) };

  return { ok: true as const, property, authUser };
}

// ─── GET — list expenses, optionally filtered by month ───────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const monthParam = req.nextUrl.searchParams.get("month");
    const query: Record<string, unknown> = { propertyId: auth.property._id };

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      query.expenseDate = {
        $gte: new Date(y, m - 1, 1),
        $lt:  new Date(y, m, 1),
      };
    }

    const expenses = await Expense.find(query).sort({ expenseDate: -1 }).lean();
    return successResponse(expenses, "Expenses fetched");
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch expenses",
      500,
    );
  }
}

// ─── POST — log a new expense ────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await resolveAndAuthorize(id);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { category, description, amount, expenseDate } = body;

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return errorResponse(`category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`, 400);
    }
    if (!description?.trim()) {
      return errorResponse("description is required", 400);
    }
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return errorResponse("amount must be a positive number", 400);
    }
    const date = expenseDate ? new Date(expenseDate) : new Date();
    if (isNaN(date.getTime())) {
      return errorResponse("expenseDate must be a valid date", 400);
    }

    const expense = await Expense.create({
      propertyId:  auth.property._id,
      category,
      description: description.trim(),
      amount:      Number(amount),
      expenseDate: date,
      recordedBy:  auth.authUser.userId,
    });

    return successResponse(expense, "Expense logged", 201);
  } catch (error) {
    console.error(error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to log expense",
      500,
    );
  }
}
