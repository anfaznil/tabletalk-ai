import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSubscription } from "@/lib/billing/subscription";
import { getRestaurantId } from "@/lib/store/tenant";
import { BillingPanel } from "@/app/settings/billing/BillingPanel";

export default async function BillingPage() {
  const restaurantId = await getRestaurantId();
  const sub = await getSubscription(restaurantId);

  return (
    <DashboardLayout>
      <PageHeader
        title="Billing"
        description="Plan, usage, and payment settings"
      />
      <div className="px-8 py-6">
        <BillingPanel sub={sub} />
      </div>
    </DashboardLayout>
  );
}
