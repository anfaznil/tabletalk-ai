import { NextResponse } from "next/server";
import { ensureCategory } from "@/lib/store/categories";
import {
  addMenuItem,
  getMenuItems,
  reorderMenuItemsInCategory,
  updateMenuItem,
} from "@/lib/store/menu";

export async function GET() {
  return NextResponse.json(getMenuItems());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, price, category, prep_time_minutes } = body;

  if (!name || price === undefined || prep_time_minutes === undefined) {
    return NextResponse.json(
      { error: "name, price, and prep_time_minutes required" },
      { status: 400 }
    );
  }

  const numericPrice = Number(price);
  const numericPrep = Number(prep_time_minutes);

  if (isNaN(numericPrice) || numericPrice < 0) {
    return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
  }
  if (isNaN(numericPrep) || numericPrep < 0) {
    return NextResponse.json({ error: "prep_time_minutes must be a non-negative number" }, { status: 400 });
  }

  const item = addMenuItem({
    name,
    description: description ?? "",
    price: numericPrice,
    category: category ?? "General",
    prep_time_minutes: numericPrep,
    availability: body.availability ?? "in_stock",
    sort_order: body.sort_order,
  });
  ensureCategory(item.category);

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (body?.action === "reorder") {
    const { error } = reorderMenuItemsInCategory(
      String(body?.category ?? ""),
      Array.isArray(body?.itemIds) ? body.itemIds.map(String) : []
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(getMenuItems());
  }

  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const numericFields = ["price", "prep_time_minutes"] as const;
  for (const field of numericFields) {
    if (updates[field] !== undefined) {
      updates[field] = Number(updates[field]);
    }
  }

  const updated = updateMenuItem(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  ensureCategory(updated.category);

  return NextResponse.json(updated);
}
