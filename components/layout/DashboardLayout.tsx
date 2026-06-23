import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({
  children,
  className = "",
  fullHeight = false,
}: {
  children: ReactNode;
  className?: string;
  /** Use for chat — main area fills viewport height. */
  fullHeight?: boolean;
}) {
  return (
    <div className="flex h-screen min-w-[640px] overflow-y-hidden">
      <Sidebar />
      <main
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-white ${
          fullHeight ? "flex flex-col" : ""
        } ${className}`}
      >
        {children}
      </main>
    </div>
  );
}
