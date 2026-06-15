import { NextResponse } from "next/server";
import { completeOrder } from "@/lib/store/orders";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body?.action !== "complete") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const order = completeOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
