import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { RestaurantProfileSection } from "@/components/dashboard/RestaurantProfileSection";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <DashboardLayout>
      <RestaurantProfileSection />
      <div className="border-t border-stone-200">
        <DashboardView />
      </div>
    </DashboardLayout>
  );
}
