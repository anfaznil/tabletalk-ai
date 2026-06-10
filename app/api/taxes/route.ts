import { NextResponse } from "next/server";
import { getTaxes, updateTaxes } from "@/lib/store/taxes";

export async function GET() {
  return NextResponse.json(getTaxes());
}

export async function PATCH(request: Request) {
  const body = await request.json();

  const updates: Record<string, number> = {};
  if (body.food_beverage_tax_percent !== undefined) {
    updates.food_beverage_tax_percent = Number(
      body.food_beverage_tax_percent
    );
  }
  if (body.sales_tax_percent !== undefined) {
    updates.sales_tax_percent = Number(body.sales_tax_percent);
  }

  const updated = updateTaxes(updates);
  return NextResponse.json(updated);
}
