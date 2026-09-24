/**
 * In-memory SSE event bus — one channel per restaurant.
 *
 * Works on a single-server deployment (Railway). For multi-server,
 * replace with a Redis pub/sub channel in a future PR.
 */

import type { Order } from "@/lib/store/orders";

type Listener = (order: Order) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(restaurantId: string, fn: Listener): () => void {
  let set = listeners.get(restaurantId);
  if (!set) { set = new Set(); listeners.set(restaurantId, set); }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(restaurantId);
  };
}

export function emit(restaurantId: string, order: Order): void {
  const set = listeners.get(restaurantId);
  if (!set) return;
  for (const fn of set) fn(order);
}
