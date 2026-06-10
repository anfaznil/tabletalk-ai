import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/format";
import type { Lead } from "@/lib/store/leads";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <p className="py-8 text-center text-sm text-stone-500">
        No leads captured yet. Try the chat simulator and ask about catering or
        a large order.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="pb-3 pr-4 font-medium">Type</th>
            <th className="pb-3 pr-4 font-medium">Customer</th>
            <th className="pb-3 pr-4 font-medium">Event Date</th>
            <th className="pb-3 pr-4 font-medium">Guests</th>
            <th className="pb-3 pr-4 font-medium">Notes</th>
            <th className="pb-3 font-medium">Captured</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-stone-100">
              <td className="py-3 pr-4">
                <Badge color={lead.lead_type === "catering" ? "info" : "warning"}>
                  {lead.lead_type === "catering" ? "catering" : "large order"}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <p className="font-medium">{lead.customer_name}</p>
                {lead.phone && (
                  <p className="text-xs text-stone-500">{lead.phone}</p>
                )}
              </td>
              <td className="py-3 pr-4">{lead.event_date}</td>
              <td className="py-3 pr-4">{lead.guest_count}</td>
              <td className="py-3 pr-4 text-stone-600">{lead.notes ?? "—"}</td>
              <td className="py-3 text-stone-500">
                {formatDateTime(lead.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
