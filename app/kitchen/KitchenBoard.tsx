"use client";

/**
 * KitchenBoard — real-time order ticket display for the kitchen iPad.
 *
 * - Connects to GET /api/orders/stream (SSE) for new orders
 * - Plays an audio alert and rings visually on each new order
 * - Accept: marks order completed + triggers print (native bridge in Phase 4)
 * - Reject: marks order cancelled
 * - Offline print queue: IndexedDB, flushed when printer reconnects
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/store/orders";

// ─── Types ─────────────────────────────────────────────────────────────────

type TicketState = "incoming" | "accepted" | "rejected";

interface Ticket {
  order: Order;
  state: TicketState;
  arrivedAt: number;
}

// ─── Offline print queue (IndexedDB) ───────────────────────────────────────

const DB_NAME = "tabletalk_kitchen";
const STORE_NAME = "print_queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueForPrint(order: Order): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id: order.id, order, queuedAt: Date.now() });
  } catch {
    // IndexedDB not available (private window etc.) — skip queuing
  }
}

async function dequeueAll(): Promise<Order[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result ?? []) as { order: Order }[];
        rows.forEach((r) => store.delete(r.order.id));
        resolve(rows.map((r) => r.order));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ─── Native print bridge (stub — wired in Phase 4 via Capacitor) ───────────

declare global {
  interface Window {
    TabletTalkPrint?: {
      printOrder: (order: Order) => Promise<{ success: boolean; queued?: boolean }>;
      printerStatus: () => Promise<"online" | "offline" | "paper_out" | "cover_open">;
    };
  }
}

async function printOrder(order: Order): Promise<"printed" | "queued" | "no_printer"> {
  if (typeof window === "undefined") return "no_printer";

  if (window.TabletTalkPrint) {
    const result = await window.TabletTalkPrint.printOrder(order);
    return result.queued ? "queued" : result.success ? "printed" : "queued";
  }

  // Web fallback: queue in IndexedDB until native bridge is available
  await queueForPrint(order);
  return "queued";
}

async function getPrinterStatus(): Promise<"online" | "offline" | "paper_out" | "cover_open" | "unknown"> {
  if (typeof window !== "undefined" && window.TabletTalkPrint) {
    return window.TabletTalkPrint.printerStatus();
  }
  return "unknown";
}

// ─── Sound alert ───────────────────────────────────────────────────────────

function playAlert(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";

    // Three short beeps
    const now = ctx.currentTime;
    [0, 0.25, 0.5].forEach((offset) => {
      oscillator.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.3, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
    });

    oscillator.start(now);
    oscillator.stop(now + 0.75);
  } catch {
    // AudioContext blocked (user hasn't interacted yet) — silent fail
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Ticket card ───────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  now,
  onAccept,
  onReject,
}: {
  ticket: Ticket;
  now: number;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { order, state, arrivedAt } = ticket;
  const age = now - arrivedAt;
  const isNew = state === "incoming";
  const urgent = isNew && age > 60_000; // >1 min not yet accepted

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 bg-white shadow-md transition-all ${
        state === "rejected"
          ? "border-stone-200 opacity-40"
          : state === "accepted"
          ? "border-green-400"
          : urgent
          ? "border-red-400 ring-2 ring-red-200"
          : "border-teal-400 ring-2 ring-teal-100"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between rounded-t-xl px-4 py-3 ${
          state === "rejected"
            ? "bg-stone-100"
            : state === "accepted"
            ? "bg-green-50"
            : urgent
            ? "bg-red-50"
            : "bg-teal-50"
        }`}
      >
        <div>
          <p className="text-lg font-bold text-stone-900">{order.customer_name}</p>
          <p className="text-xs text-stone-500">
            {order.phone ?? "No phone"} · {formatTime(order.created_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-stone-900">${order.total.toFixed(2)}</p>
          {isNew && (
            <p className={`text-xs font-medium ${urgent ? "text-red-600" : "text-teal-600"}`}>
              {elapsed(age)} ago
            </p>
          )}
          {state === "accepted" && <p className="text-xs font-medium text-green-600">Accepted</p>}
          {state === "rejected" && <p className="text-xs font-medium text-stone-400">Rejected</p>}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 divide-y divide-stone-100 px-4 py-2">
        {order.items.map((item, i) => (
          <div key={i} className="py-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-stone-800">
                {item.quantity}× {item.item_name}
              </span>
              <span className="text-stone-500">${item.line_total.toFixed(2)}</span>
            </div>
            {item.customizations.length > 0 && (
              <p className="mt-0.5 text-xs text-stone-500">
                {item.customizations.map((c) => c.name).join(", ")}
              </p>
            )}
            {item.notes && (
              <p className="mt-0.5 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-2 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Note: {order.notes}
        </div>
      )}

      {/* Actions */}
      {state === "incoming" && (
        <div className="flex gap-2 rounded-b-xl bg-stone-50 px-4 py-3">
          <button
            onClick={() => onReject(order.id)}
            className="flex-1 rounded-lg border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-600 active:bg-stone-100"
          >
            Reject
          </button>
          <button
            onClick={() => onAccept(order.id)}
            className="flex-2 flex-grow rounded-lg bg-teal-500 py-3 text-sm font-bold text-white shadow-sm active:bg-teal-600"
          >
            Accept & Print
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main board ────────────────────────────────────────────────────────────

export function KitchenBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    initialOrders
      .filter((o) => o.status === "pending")
      .map((o) => ({ order: o, state: "incoming" as TicketState, arrivedAt: new Date(o.created_at).getTime() }))
  );
  const [now, setNow] = useState(Date.now());
  const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [printerStatus, setPrinterStatus] = useState<string>("unknown");
  const [printLog, setPrintLog] = useState<{ id: string; result: string }[]>([]);
  const ringRef = useRef(false);

  // Clock tick for elapsed timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Printer status poll
  useEffect(() => {
    let active = true;
    async function poll() {
      while (active) {
        const status = await getPrinterStatus();
        if (active) setPrinterStatus(status);

        // If printer just came online, flush the queue
        if (status === "online") {
          const queued = await dequeueAll();
          for (const order of queued) {
            await window.TabletTalkPrint!.printOrder(order);
          }
        }
        await new Promise((r) => setTimeout(r, 15_000));
      }
    }
    poll();
    return () => { active = false; };
  }, []);

  // SSE connection
  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      setSseStatus("connecting");
      es = new EventSource("/api/orders/stream");

      es.addEventListener("connected", () => setSseStatus("connected"));

      es.addEventListener("new_order", (e) => {
        const order = JSON.parse(e.data) as Order;
        setTickets((prev) => {
          if (prev.find((t) => t.order.id === order.id)) return prev;
          return [{ order, state: "incoming", arrivedAt: Date.now() }, ...prev];
        });

        if (!ringRef.current) {
          ringRef.current = true;
          playAlert();
          setTimeout(() => { ringRef.current = false; }, 1000);
        }
      });

      es.onerror = () => {
        es.close();
        setSseStatus("disconnected");
        reconnectTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  const handleAccept = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.order.id === id ? { ...t, state: "accepted" as TicketState } : t))
    );

    // Update DB
    void fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });

    // Print
    const ticket = tickets.find((t) => t.order.id === id);
    if (ticket) {
      const result = await printOrder(ticket.order);
      setPrintLog((prev) => [{ id, result }, ...prev].slice(0, 20));
    }
  }, [tickets]);

  const handleReject = useCallback((id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.order.id === id ? { ...t, state: "rejected" as TicketState } : t))
    );
    void fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
  }, []);

  const incoming = tickets.filter((t) => t.state === "incoming");
  const done = tickets.filter((t) => t.state !== "incoming");

  return (
    <div className="flex h-screen flex-col bg-stone-100">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
            T
          </div>
          <span className="text-sm font-bold tracking-widest text-stone-800">KITCHEN</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* SSE status */}
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                sseStatus === "connected"
                  ? "bg-green-400"
                  : sseStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            <span className="text-stone-500 capitalize">{sseStatus}</span>
          </div>

          {/* Printer status */}
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            <span
              className={`font-medium ${
                printerStatus === "online"
                  ? "text-green-600"
                  : printerStatus === "unknown"
                  ? "text-stone-400"
                  : "text-red-500"
              }`}
            >
              {printerStatus === "unknown" ? "No printer" : printerStatus}
            </span>
          </div>

          {incoming.length > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
              {incoming.length} new
            </span>
          )}
        </div>
      </header>

      {/* Board */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Incoming column */}
        <div className="flex w-1/2 flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Incoming ({incoming.length})
          </h2>
          {incoming.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-stone-200 py-16 text-sm text-stone-400">
              Waiting for orders…
            </div>
          ) : (
            incoming.map((t) => (
              <TicketCard
                key={t.order.id}
                ticket={t}
                now={now}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))
          )}
        </div>

        {/* Done column */}
        <div className="flex w-1/2 flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Recent ({done.length})
          </h2>
          {done.map((t) => (
            <TicketCard
              key={t.order.id}
              ticket={t}
              now={now}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
