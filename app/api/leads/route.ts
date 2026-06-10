import { NextResponse } from "next/server";
import { getLeads } from "@/lib/store/leads";

export async function GET() {
  return NextResponse.json(getLeads());
}
