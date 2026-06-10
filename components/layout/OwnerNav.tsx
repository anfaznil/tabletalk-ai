import Link from "next/link";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/chat", label: "Chat" },
  { href: "/orders", label: "Orders" },
  { href: "/leads", label: "Leads" },
];

export function OwnerNav({ active }: { active?: string }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
        <p className="font-bold text-amber-700">Deen's Bistro</p>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                size="sm"
                variant={active === link.href ? "primary" : "ghost"}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
