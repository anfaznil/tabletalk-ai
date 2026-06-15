import { NextResponse } from "next/server";
import { deleteCustomization } from "@/lib/store/customizations";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteCustomization(id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Customization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
