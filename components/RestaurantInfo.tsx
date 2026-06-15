import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/format";
import type { Restaurant } from "@/lib/data/deens-bistro";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-b-2 border-teal-600 pb-1 text-lg font-semibold text-stone-900">
      {children}
    </h2>
  );
}

export function RestaurantInfo({ restaurant }: { restaurant: Restaurant }) {
  const dayLabels: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  const menuGroups = new Map<string, typeof restaurant.menu_items>();
  for (const item of restaurant.menu_items) {
    const category = item.category || "Other";
    if (!menuGroups.has(category)) menuGroups.set(category, []);
    menuGroups.get(category)!.push(item);
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Hours</SectionTitle>
        <ul className="mt-4 space-y-1 text-sm text-stone-600">
          {Object.entries(restaurant.hours).map(([day, hours]) => (
            <li key={day}>
              <span className="font-medium text-stone-800">
                {dayLabels[day] ?? day}:
              </span>{" "}
              {hours}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle>Menu</SectionTitle>
        {[...menuGroups.entries()].map(([category, items]) => (
          <div key={category} className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              {category}
            </h3>
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium text-stone-900">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-stone-500">
                      {formatCurrency(item.price)} · {item.prep_time_minutes} min
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-stone-500">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>FAQs</SectionTitle>
        <dl className="mt-4 space-y-4">
          {restaurant.faqs.map((faq) => (
            <div key={faq.id} className="text-sm">
              <dt className="font-medium text-stone-900">{faq.question}</dt>
              <dd className="mt-1 text-stone-600">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
