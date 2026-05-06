import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Role } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const filter: Record<string, unknown> = { isActive: true };

    if (role) {
      const normalized = role.toUpperCase();
      if (!Object.values(Role).includes(normalized as Role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      filter.role = normalized;
    }

    const users = await User.find(filter)
      .select("_id fullName email phoneNumber role")
      .sort({ fullName: 1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}