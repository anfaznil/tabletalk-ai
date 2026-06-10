import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/format";
import type { Restaurant } from "@/lib/data/deens-bistro";

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

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold">{restaurant.name}</h2>
        <dl className="mt-3 space-y-1 text-sm text-stone-600">
          <div>
            <dt className="inline font-medium text-stone-700">Address: </dt>
            <dd className="inline">{restaurant.address}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-stone-700">Phone: </dt>
            <dd className="inline">{restaurant.phone}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="font-semibold">Hours</h3>
        <ul className="mt-2 space-y-1 text-sm text-stone-600">
          {Object.entries(restaurant.hours).map(([day, hours]) => (
            <li key={day}>
              <span className="font-medium text-stone-700">
                {dayLabels[day] ?? day}:
              </span>{" "}
              {hours}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">Menu</h3>
        <ul className="mt-2 divide-y divide-stone-100">
          {restaurant.menu_items.map((item) => (
            <li key={item.id} className="py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{item.name}</span>
                <span className="text-stone-600">
                  {formatCurrency(item.price)} · {item.prep_time_minutes} min
                </span>
              </div>
              <p className="text-stone-500">{item.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">FAQs</h3>
        <dl className="mt-2 space-y-3">
          {restaurant.faqs.map((faq) => (
            <div key={faq.id} className="text-sm">
              <dt className="font-medium text-stone-800">{faq.question}</dt>
              <dd className="mt-0.5 text-stone-600">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
