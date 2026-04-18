// app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const address    = searchParams.get("address");
  const components = searchParams.get("components");
  const region     = searchParams.get("region");

  // Need at least address or components to make a valid request
  if (!address && !components) {
    return NextResponse.json({ error: "address or components required" }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set("key", process.env.GOOGLE_MAPS_API_KEY!);
  if (address)    params.set("address", address);
  if (components) params.set("components", components);
  if (region)     params.set("region", region);

  const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  const data = await res.json();

  return NextResponse.json(data);
}