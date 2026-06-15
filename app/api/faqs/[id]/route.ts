import { NextResponse } from "next/server";
import { deleteFaq } from "@/lib/store/faqs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteFaq(id);

  if (!deleted) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
