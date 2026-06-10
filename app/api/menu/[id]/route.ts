import { NextResponse } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/lib/store/menu";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const numericFields = ["price", "prep_time_minutes"] as const;
  for (const field of numericFields) {
    if (body[field] !== undefined) {
      body[field] = Number(body[field]);
    }
  }

  const updated = updateMenuItem(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteMenuItem(id);

  if (!deleted) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
