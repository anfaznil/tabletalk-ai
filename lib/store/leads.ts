import { loadPersisted, savePersisted } from "@/lib/store/persist";

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

const globalStore = globalThis as unknown as { leads: Lead[] };

if (!globalStore.leads) {
  globalStore.leads = loadPersisted("leads", () => []);
}

export function addLead(
  input: Omit<Lead, "id" | "created_at">
): Lead {
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  globalStore.leads.unshift(lead);
  savePersisted("leads", globalStore.leads);
  return lead;
}

export function getLeads(): Lead[] {
  return globalStore.leads;
}
