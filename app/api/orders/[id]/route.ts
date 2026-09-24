import { NextResponse } from "next/server";
import { completeOrder, setOrderStatus } from "@/lib/store/orders";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action as string | undefined;

  if (action === "complete") {
    const order = await completeOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }

  if (action === "accept") {
    const order = await setOrderStatus(id, "completed");
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }

  if (action === "reject") {
    const order = await setOrderStatus(id, "cancelled");
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
