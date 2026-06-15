import Link from "next/link";
import { RestaurantInfo } from "@/components/RestaurantInfo";
import { Button } from "@/components/ui/Button";
import { deensBistro } from "@/lib/data/deens-bistro";
import { getFaqs } from "@/lib/store/faqs";
import { getHours } from "@/lib/store/hours";
import { getStoreInfo } from "@/lib/store/info";
import { getMenuItems } from "@/lib/store/menu";

function formatWebsiteDisplay(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function RestaurantProfileSection() {
  const store = getStoreInfo();
  const restaurant = {
    ...deensBistro,
    ...store,
    menu_items: getMenuItems(),
    hours: getHours(),
    faqs: getFaqs(),
  };

  const cityLine = store.address.split(",").slice(-2).join(",").trim();
  const isHalal = restaurant.faqs.some(
    (faq) =>
      faq.question.toLowerCase().includes("halal") &&
      faq.answer.toLowerCase().startsWith("yes")
  );

  return (
    <>
      <div className="border-b border-stone-200 px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {cityLine && (
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {cityLine}
              </p>
            )}
            <h1 className="mt-1 text-3xl font-bold uppercase tracking-tight text-stone-900">
              {restaurant.name}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              AI phone assistant — pickup orders, questions, and catering
              inquiries.
            </p>
          </div>
          <Link href="/chat" className="shrink-0">
            <Button>Open Chat Simulator</Button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            {store.logo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_data_url}
                alt={`${restaurant.name} logo`}
                className="h-40 w-40 rounded-lg border border-stone-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-400">
                No logo
              </div>
            )}

            <div className="mt-6 min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Contact &amp; Location
              </h2>
              <p className="mt-2 break-words text-sm text-stone-600">
                {store.address}
              </p>
              <p className="mt-1 text-sm text-stone-600">{store.phone}</p>
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={store.website}
                  className="mt-1 block max-w-full break-all text-sm text-teal-600 hover:underline"
                >
                  {formatWebsiteDisplay(store.website)}
                </a>
              )}
            </div>

            <div className="mt-6 min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Business Details
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-stone-600">
                {isHalal && <li>Halal</li>}
                <li>
                  Catering {store.catering_available ? "available" : "not available"}
                </li>
              </ul>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="border-b-2 border-teal-600 pb-1 text-lg font-semibold text-stone-900">
              About
            </h2>
            <h3 className="mt-4 text-sm font-semibold text-stone-800">
              The Business
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {restaurant.name} uses TableTalk AI to handle customer calls —
              menu questions, pickup orders, and catering leads. Configure your
              menu, customizations, and store settings from the sidebar, then
              test conversations in the chat simulator.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/menu">
                <Button variant="secondary" size="sm">
                  Edit Menu
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  Store Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <RestaurantInfo restaurant={restaurant} />
      </div>
    </>
  );
}
