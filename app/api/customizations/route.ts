import { NextResponse } from "next/server";
import {
  addCustomization,
  getCustomizations,
  updateCustomization,
} from "@/lib/store/customizations";

export async function GET() {
  return NextResponse.json(getCustomizations());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, price_modifier, menu_item_ids } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const customization = addCustomization({
    name,
    description: description ?? "",
    price_modifier: Number(price_modifier) || 0,
    menu_item_ids: Array.isArray(menu_item_ids) ? menu_item_ids : [],
  });

  return NextResponse.json(customization, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (updates.price_modifier !== undefined) {
    updates.price_modifier = Number(updates.price_modifier) || 0;
  }

  const updated = updateCustomization(id, updates);
  if (!updated) {
    return NextResponse.json(
      { error: "Customization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}
