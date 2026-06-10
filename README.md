# TableTalk AI

AI phone assistant for restaurants. Answers customer questions, takes accurate pickup orders, and captures catering leads — like a reliable employee who never misses the phone.

This MVP simulates phone calls through a web chat for **Deen's Bistro**, a sample halal restaurant in Brooklyn.

---

## What It Does

**For customers (via chat):**
- Answers questions (hours, location, halal, menu) using only real restaurant data
- Takes pickup orders with exact menu items — never invents or substitutes items
- Quotes one all-in price (tax included, no breakdown)
- Gives a concrete ready-by clock time, accounting for rush hour
- Captures catering and large-event inquiries as leads

**For the restaurant owner (admin pages):**
- Edit menu items, prices, and prep times
- Edit opening hours per day
- Configure tax rates (food & beverage + sales)
- View incoming orders with ready-by times
- View captured catering/large-order leads

## Pages

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | Both | Restaurant info, menu preview, navigation |
| `/chat` | Customer | AI chat simulator (simulates a phone call) |
| `/menu` | Owner | Edit menu, prices, prep times, hours, taxes |
| `/orders` | Owner | Live pickup orders (auto-refresh) |
| `/leads` | Owner | Catering & large-event leads (auto-refresh) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│                                                      │
│  Pages (App Router)          API Routes              │
│  ├── /            ──────►    ├── POST /api/chat      │
│  ├── /chat                   ├── GET  /api/orders    │
│  ├── /menu                   ├── GET  /api/leads     │
│  ├── /orders                 ├── GET/POST/PATCH      │
│  └── /leads                  │        /api/menu      │
│                              ├── GET/PATCH /api/hours│
│                              └── GET/PATCH /api/taxes│
│                                                      │
│  AI Layer (lib/ai)           Business Logic          │
│  ├── context.ts   ──────►    (lib/orders)            │
│  ├── prompts.ts              ├── validate.ts         │
│  ├── tools.ts                ├── totals.ts           │
│  └── handlers.ts             ├── ready-time.ts       │
│         │                    └── closing.ts          │
│         ▼                                            │
│  In-Memory Stores (lib/store)                        │
│  ├── menu.ts    ├── orders.ts                        │
│  ├── leads.ts   ├── hours.ts   └── taxes.ts          │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
              OpenAI (gpt-4o-mini)
              with function calling
```

### Request flow for a chat message

1. Customer sends a message → `POST /api/chat`
2. Server builds a **system prompt** from live restaurant data (menu, hours, taxes, rush-hour and closing rules)
3. OpenAI responds — either with text or a **tool call**
4. Tool calls run server-side (`lib/ai/handlers.ts`): validate items, compute totals/ready times, save orders/leads
5. Tool results feed back to the model for a final, natural-language reply

---

## Design Decisions & Rationale

### 1. No database (yet)

All state lives in in-memory stores (`lib/store/*`) attached to `globalThis`, seeded from mock data in `lib/data/deens-bistro.ts`.

**Why:** The goal of this MVP is to validate the customer experience — how the AI talks, takes orders, and handles edge cases — before investing in infrastructure. In-memory state allows instant iteration with zero setup. The store modules expose the same function shapes (`getX`, `addX`, `updateX`) a database layer would, so swapping in Supabase later is a contained change.

**Trade-off:** Data resets on server restart. Acceptable for a demo; not for production.

### 2. Server-side calculation tools (never trust the LLM with math)

The AI must call dedicated tools rather than compute anything itself:

| Tool | Purpose |
|------|---------|
| `quote_order_total` | Exact total with tax |
| `quote_ready_time` | Ready-by clock time with rush-hour buffer |
| `capture_order` | Validate + persist the order |
| `capture_catering_lead` / `capture_large_order_lead` | Persist leads |

**Why:** LLMs are unreliable at arithmetic — during development the model misapplied the tax rate (quoted $14.82 instead of $14.46). Moving all money and time math to deterministic server code eliminated that class of bug. The model's job is conversation; the server's job is correctness.

### 3. Order accuracy through ID-based validation

The AI references menu items by **ID**, and `validateOrderItems` rejects anything not on the menu. Prices come from the store at order time, never from the model.

**Why:** Early testing showed the model substituting items (customer asked for a soda, got a Mango Lassi). Strict ID validation plus explicit "never substitute" prompt rules ensure the kitchen receives exactly what the customer said. If an item isn't on the menu, the AI says so instead of improvising.

### 4. Prep time = longest item, not the sum

A rice platter (10 min) + cheeseburger (5 min) = **10 minutes**, because kitchens cook in parallel. Implemented in `lib/orders/ready-time.ts` as `max(prep_time_minutes)` over the order.

**Why:** This mirrors how real kitchens work. Owners set per-item prep times in `/menu`; the math stays predictable.

### 5. Rush-hour buffers

Lunch (11:30 AM–2 PM) and dinner (5:30–9 PM) automatically add +10 min (small orders) or +15 min (large orders, > $300 subtotal).

**Why:** A quoted time the kitchen can't hit is worse than no quote. The buffer is applied server-side in `calculateReadyBy`, so the AI can't forget it.

### 6. Closing-time guardrails

- Last order: **15 minutes before closing**
- Within 15 minutes of the last-order cutoff: only items with **≤ 10 min prep**
- An order whose ready-by time would land past the cutoff is rejected

**Why:** Protects staff from orders they can't complete. Enforced in `lib/orders/closing.ts` as validation that throws customer-friendly error messages the AI relays naturally.

### 7. One all-in price; tax configured by the owner

Owners set food & beverage tax (6%) and sales tax (5.3%) in `/menu`. Totals always include tax. The AI quotes one number — never a breakdown, never "tax will be added at checkout."

**Why:** Phone customers want to know what they'll pay. Tax rates vary by jurisdiction, so they're configuration, not code.

### 8. Heavily-tuned conversational prompt

The system prompt (`lib/ai/prompts.ts`) encodes tone rules learned through iteration:

- Opens with "Hi, this is Deen's Bistro." then **waits** — like a real call
- 1–2 sentence replies, contractions, no bullet lists, no call-center phrases
- No "thank you for calling" sign-offs
- Confirms orders in plain speech: *"Just to confirm, you want a cheeseburger and a mango lassi?"*
- Answers hours questions for **today only** unless asked for the full week (current date/time is injected into context)
- Mentions ready time exactly once, as a clock time ("ready by 12:45"), only after the order is saved

**Why:** The product should feel like hiring a person, not deploying a bot. Each rule traces to a real awkwardness found in testing.

### 9. Orders vs. leads

Menu orders (any size) → `orders` store, shown in `/orders` with ready-by times.
Catering and future-event inquiries → `leads` store (name, event date, guest count; phone optional).

**Why:** They're different workflows. An order goes to the kitchen now; a lead needs a human follow-up later. Customers are never required to give a phone number — reduces friction on the call.

---

## Tech Stack

- **Next.js 15** (App Router) — pages + API routes in one deployable unit
- **TypeScript** — shared types between stores, API, and UI
- **Tailwind CSS 4** — fast, consistent styling without a component library
- **OpenAI gpt-4o-mini** — low-cost, fast, supports function calling

## Project Structure

```
app/
├── page.tsx              # Home: restaurant info
├── chat/page.tsx         # Customer chat simulator
├── menu/page.tsx         # Owner: menu, hours, taxes
├── orders/page.tsx       # Owner: live orders
├── leads/page.tsx        # Owner: captured leads
└── api/
    ├── chat/route.ts     # AI conversation + tool execution
    ├── menu/...          # Menu CRUD
    ├── hours/route.ts    # Hours get/update
    ├── taxes/route.ts    # Tax config
    ├── orders/route.ts   # Orders list
    └── leads/route.ts    # Leads list

lib/
├── data/deens-bistro.ts  # Seed data (restaurant, menu, FAQs)
├── store/                # In-memory state (menu, orders, leads, hours, taxes)
├── ai/
│   ├── context.ts        # Builds live restaurant context for the prompt
│   ├── prompts.ts        # System prompt + behavior rules
│   ├── tools.ts          # Function-calling tool definitions
│   └── handlers.ts       # Server-side tool execution
├── orders/
│   ├── validate.ts       # Item validation, large-order classification
│   ├── totals.ts         # Tax-inclusive totals
│   ├── ready-time.ts     # Prep time + rush-hour → ready-by
│   └── closing.ts        # Last-order and late-window rules
└── utils/format.ts       # Currency/date formatting

components/               # UI: chat, tables, forms, layout
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- An OpenAI API key ([platform.openai.com](https://platform.openai.com/api-keys))

### Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local and set OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try it

In `/chat`:

- *"Are you halal?"* — FAQ answer
- *"What time do you open?"* — today's hours only
- *"I'll take a chicken over rice and a can of soda"* — order flow with name, confirmation, total, ready-by time
- *"I need catering for 50 people on July 15"* — catering lead capture

Then check `/orders` and `/leads`.

---

## Roadmap (Phase 2)

- Supabase persistence (schema designed; store layer is swap-ready)
- Owner authentication and multi-restaurant support
- Twilio Voice integration (real phone calls)
- SMS follow-ups and call recordings
- POS integrations

## License

Private — all rights reserved.
