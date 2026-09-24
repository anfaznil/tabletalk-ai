import { NextResponse } from "next/server";
import { getCallLogs } from "@/lib/store/call-logs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  return NextResponse.json(await getCallLogs(limit));
}
