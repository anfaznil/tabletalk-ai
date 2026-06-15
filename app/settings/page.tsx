import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { HoursSettings } from "@/components/forms/HoursSettings";
import { TaxSettings } from "@/components/forms/TaxSettings";
import { StoreInfoSettings } from "@/components/forms/StoreInfoSettings";
import { FaqSettings } from "@/components/forms/FaqSettings";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Store Settings"
        description="Store info, hours, taxes, and FAQs — the AI uses these live"
      />
      <div className="space-y-4 px-8 py-6">
        <StoreInfoSettings />

        <HoursSettings />

        <TaxSettings />

        <FaqSettings />
      </div>
    </DashboardLayout>
  );
}
