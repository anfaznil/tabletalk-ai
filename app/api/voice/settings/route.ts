import { NextResponse } from "next/server";
import { getVoiceSettings, updateVoiceSettings } from "@/lib/store/voice";

export async function GET() {
  return NextResponse.json(getVoiceSettings());
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { settings, error } = updateVoiceSettings(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(settings);
}
