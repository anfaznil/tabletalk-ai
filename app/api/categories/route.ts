import { NextResponse } from "next/server";
import {
  addCategory,
  deleteCategory,
  getCategories,
  moveCategory,
  renameCategory,
} from "@/lib/store/categories";

export async function GET() {
  return NextResponse.json(getCategories());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { category, error } = addCategory(String(body?.name ?? ""));

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (body?.action === "move") {
    const direction = body?.direction === "down" ? "down" : "up";
    const { categories, error } = moveCategory(String(body?.name ?? ""), direction);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ categories });
  }

  const { category, error } = renameCategory(
    String(body?.from ?? ""),
    String(body?.to ?? "")
  );

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ category });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "";

  const { error, deletedItemCount } = deleteCategory(name);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, deletedItemCount });
}
