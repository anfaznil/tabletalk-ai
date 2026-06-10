"use client";

import { useEffect, useState, useCallback } from "react";
import { OwnerNav } from "@/components/layout/OwnerNav";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Lead } from "@/lib/store/leads";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, 3000);
    return () => clearInterval(interval);
  }, [loadLeads]);

  return (
    <div className="min-h-screen bg-stone-50">
      <OwnerNav active="/leads" />

      <main className="mx-auto max-w-4xl space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Leads</h1>
            <p className="text-sm text-stone-500">
              Catering & large orders · resets on server restart
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadLeads}>
            Refresh
          </Button>
        </div>
        <Card>
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Loading...
            </p>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </Card>
      </main>
    </div>
  );
}
