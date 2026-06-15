"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
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
    <DashboardLayout>
      <PageHeader
        title="Leads"
        description="Catering and large-order inquiries"
        action={
          <Button variant="secondary" size="sm" onClick={loadLeads}>
            Refresh
          </Button>
        }
      />
      <div className="px-8 py-6">
        <Card>
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Loading...
            </p>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
