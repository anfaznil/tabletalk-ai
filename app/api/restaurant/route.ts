import { NextResponse } from "next/server";
import { getStoreInfo, updateStoreInfo } from "@/lib/store/info";

export async function GET() {
  return NextResponse.json({
    ...getStoreInfo(),
    // Expose the Twilio number so the settings UI can show forwarding instructions.
    twilio_number: process.env.TWILIO_PHONE_NUMBER ?? null,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { info, errors } = updateStoreInfo(body);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ info, errors }, { status: 400 });
  }

  return NextResponse.json(info);
}
