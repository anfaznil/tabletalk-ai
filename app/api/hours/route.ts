import { NextResponse } from "next/server";
import { getHours, updateHours } from "@/lib/store/hours";

export async function GET() {
  return NextResponse.json(getHours());
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { hours, errors } = updateHours(body as Record<string, string>);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ hours, errors }, { status: 400 });
  }

  return NextResponse.json(hours);
}
