import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export type LeadType = "catering" | "large_order";

export interface Lead {
  id: string;
  lead_type: LeadType;
  customer_name: string;
  phone: string | null;
  event_date: string;
  guest_count: number;
  notes: string | null;
  created_at: string;
}

function toLead(row: {
  id: string;
  lead_type: string;
  customer_name: string;
  phone: string | null;
  event_date: string;
  guest_count: number;
  notes: string | null;
  created_at: Date;
}): Lead {
  return {
    id: row.id,
    lead_type: row.lead_type as LeadType,
    customer_name: row.customer_name,
    phone: row.phone,
    event_date: row.event_date,
    guest_count: row.guest_count,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
  };
}

export async function addLead(input: Omit<Lead, "id" | "created_at">): Promise<Lead> {
  const rid = await getRestaurantId();
  const row = await prisma.lead.create({
    data: {
      restaurant_id: rid,
      lead_type: input.lead_type,
      customer_name: input.customer_name,
      phone: input.phone,
      event_date: input.event_date,
      guest_count: input.guest_count,
      notes: input.notes,
    },
  });
  return toLead(row);
}

export async function getLeads(): Promise<Lead[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.lead.findMany({
    where: { restaurant_id: rid },
    orderBy: { created_at: "desc" },
  });
  return rows.map(toLead);
}
