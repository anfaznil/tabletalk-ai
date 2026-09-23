# TableTalk AI

AI phone assistant for restaurants. Answers customer questions, takes accurate pickup orders, and transfers catering inquiries to staff — like a reliable employee who never misses the phone.

This MVP uses a web chat widget to simulate phone conversations for **Deen's Bistro**, a sample halal restaurant in Charlottesville, VA. Twilio Voice integration (real phone calls) is the next phase.

---

## What It Does

**For customers (via chat or phone):**
- Answers questions (hours, location, halal, menu) using only real restaurant data
- Takes pickup orders with exact menu items — never invents or substitutes items
- Quotes one all-in price (tax included, no breakdown)
- Gives a concrete wait time, accounting for rush hour
- Routes catering inquiries and sensitive questions to staff immediately

**For the restaurant owner (dashboard):**
- Edit menu items, categories, prices, prep times, availability
- Edit opening hours per day
- Configure tax rates (food & beverage + sales)
- Manage FAQs, customizations, and restaurant info
- View incoming orders with ready-by times
- View captured catering/large-order leads

## Pages

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | Both | Restaurant info, menu preview, navigation |
| `/chat` | Customer | AI chat simulator (simulates a phone call) |
| `/menu` | Owner | Edit menu, prices, prep times, availability |
| `/orders` | Owner | Live pickup orders (auto-refresh) |
| `/leads` | Owner | Catering & large-event leads (auto-refresh) |
| `/settings` | Owner | Hours, taxes, FAQs, restaurant info |

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
              Anthropic Claude (claude-haiku-4-5)
              with native tool use
```

### Request flow for a chat message

1. Customer sends a message → `POST /api/chat`
2. Server builds a **system prompt** from live restaurant data (menu, hours, taxes, rush-hour and closing rules)
3. Claude responds — either with text or one or more **tool calls**
4. Tool calls run server-side (`lib/ai/handlers.ts`): validate items, compute totals/ready times, save orders/leads
5. Tool results feed back into the model (agentic loop) until `stop_reason === "end_turn"`
6. Final natural-language reply is returned to the client

---

## Design Decisions & Rationale

### 1. Claude instead of OpenAI (gpt-4o-mini)

The original MVP used OpenAI's `gpt-4o-mini`. We switched to **Anthropic Claude (`claude-haiku-4-5`)** for several reasons:

- **Better instruction following on phone-conversation prompts.** Claude more reliably respects multi-rule system prompts (tone, order flow, transfer rules, allergy handling) with fewer prompt-engineering workarounds needed. In side-by-side testing on the restaurant prompt, Claude produced fewer hallucinations and more consistently stayed in-character.
- **Native tool use with parallel calls.** Claude's tool-use API supports multiple simultaneous tool calls in one response turn, matching how a real phone agent might look up data and save an order together.
- **Alignment with the voice roadmap.** Anthropic's Claude is the planned AI backbone for the live Twilio phone integration. Switching now avoids running two provider SDKs in parallel during voice development.
- **First-party SDK quality.** `@anthropic-ai/sdk` ships full TypeScript types that make the agentic loop (iterating until `stop_reason !== "tool_use"`) typesafe without casting.

The tool definitions in `lib/ai/tools.ts` remain in OpenAI-style format (with a thin converter in the chat route) so adding an OpenAI or Gemini provider path later requires only a new converter, not a schema rewrite.

### 2. No database (yet)

All state lives in in-memory stores (`lib/store/*`) attached to `globalThis`, seeded from mock data in `lib/data/deens-bistro.ts` and persisted to a local JSON file (`data/store.json`, gitignored) via `lib/store/persist.ts`.

**Why:** The goal of this MVP is to validate the customer experience — how the AI talks, takes orders, and handles edge cases — before investing in infrastructure. File-backed state allows instant iteration with zero setup while surviving page refreshes and dev-server restarts. The store modules expose the same function shapes (`getX`, `addX`, `updateX`) a database layer would, so swapping in Supabase later is a contained change.

**Trade-off:** A single JSON file has no concurrency control or multi-tenancy. Acceptable for a demo; not for production.

### 3. Server-side calculation tools (never trust the LLM with math)

The AI must call dedicated tools rather than compute anything itself:

| Tool | Purpose |
|------|---------|
| `quote_order_total` | Exact total with tax |
| `quote_ready_time` | Ready-by time with rush-hour buffer |
| `capture_order` | Validate + persist the order |
| `transfer_to_staff` | Route to a human (real phone: Twilio `<Dial>`) |

**Why:** LLMs are unreliable at arithmetic — during development the model misapplied the tax rate. Moving all money and time math to deterministic server code eliminated that class of bug.

### 4. Order accuracy through ID-based validation

The AI references menu items by **ID**, and `validateOrderItems` rejects anything not on the menu. Prices come from the store at order time, never from the model.

### 5. Prep time = longest item, not the sum

A rice platter (10 min) + cheeseburger (5 min) = **10 minutes**, because kitchens cook in parallel.

### 6. Closing-time guardrails

- Last order: **15 minutes before closing**
- Within 15 minutes of last-order cutoff: only items with **≤ 10 min prep**
- Closed days are detected and orders are refused

### 7. One all-in price; tax configured by the owner

Owners set food & beverage tax and sales tax in settings. The AI quotes one number — never a breakdown, never "tax will be added at checkout."

### 8. Heavily-tuned conversational prompt

The system prompt (`lib/ai/prompts.ts`) encodes tone rules learned through iteration: opens with "Hi, this is Deen's Bistro." then waits; 1–2 sentence replies, contractions, no call-center phrases, allergy questions always name the specific dish, catering inquiries transferred immediately.

---

## Tech Stack

- **Next.js 15** (App Router) — pages + API routes in one deployable unit
- **TypeScript** — shared types between stores, API, and UI
- **Tailwind CSS 4** — fast, consistent styling
- **Anthropic Claude (claude-haiku-4-5)** — fast, accurate tool-use model for phone conversations

---

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com/settings/keys))

### Setup

```bash
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
RESTAURANT_ACCOUNT_ID=deensbistro_test   # optional; defaults to test account
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default login credentials are in `lib/auth/credentials.ts`.

### Try it

In `/chat`:

- *"Are you halal?"* — FAQ answer
- *"What time do you open?"* — today's hours only
- *"I'll take a chicken over rice and a can of soda"* — order flow with name, wait time
- *"I need catering for 50 people"* — immediate transfer to staff

Then check `/orders` and `/leads`.

---

## Twilio Voice Setup (Phase 1)

> **This section covers the planned real-phone integration. Voice is not yet live — the chat widget simulates calls for now.**

### What you'll need

1. A [Twilio account](https://www.twilio.com/try-twilio) (free trial works)
2. A Twilio phone number with Voice capability
3. A publicly reachable URL for your app (ngrok for local dev, or a deployed URL)

### Step-by-step

**1. Get a Twilio number**

In the Twilio Console → Phone Numbers → Manage → Buy a number. Pick a local number for your area. Note the number in E.164 format (e.g. `+15405550100`).

**2. Add credentials to `.env.local`**

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15405550100
TWILIO_TRANSFER_NUMBER=+15405550199   # manager's cell or second line
```

**3. Expose your local server (dev only)**

```bash
npx ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL.

**4. Configure the Twilio number**

In the Twilio Console → Your number → Configure:
- **A call comes in** → Webhook → `https://your-url.ngrok.io/api/voice/incoming` → HTTP POST
- **Call status changes** → `https://your-url.ngrok.io/api/voice/status` → HTTP POST

**5. Set up call forwarding from the restaurant's existing number**

Restaurants keep their own number and forward to the Twilio number. Choose a mode:

**Backup mode** (forward only on no-answer/busy — staff answer when they can):

| Carrier | Code to dial |
|---------|-------------|
| AT&T (mobile) | `*61*+1TWILIO_NUMBER#` (no-answer) and `*67*+1TWILIO_NUMBER#` (busy) |
| Verizon (mobile) | Settings → Calls → Call Forwarding → Forward When Unanswered |
| T-Mobile (mobile) | `**61*+1TWILIO_NUMBER**30#` (no-answer, 30-sec delay) |
| Comcast Business | Admin portal → Call Forwarding → Selective Forwarding |
| Spectrum Business | My Account → Voice → Call Forwarding → Busy/No-Answer |
| Generic VoIP | Admin portal → Hunt Groups or Call Forwarding → No-Answer/Busy |

**Full mode** (forward all calls — AI answers everything):

| Carrier | Code to dial |
|---------|-------------|
| AT&T (mobile) | `*21*+1TWILIO_NUMBER#` |
| Verizon (mobile) | Settings → Calls → Call Forwarding → Always Forward |
| T-Mobile (mobile) | `**21*+1TWILIO_NUMBER#` |
| Comcast Business | Admin portal → Call Forwarding → Unconditional |
| Spectrum Business | My Account → Voice → Call Forwarding → Always |
| Generic VoIP | Admin portal → Call Forwarding → Always/Unconditional |

To cancel forwarding: dial the cancellation code for your carrier (usually `#21#` for unconditional, `#61#` for no-answer, `#67#` for busy — check your carrier's docs).

> **Important (Full mode):** the `TWILIO_TRANSFER_NUMBER` must be a *different* number than the restaurant's main line. Transferring to the main line in Full mode would loop back to the AI. The settings page will block you from entering the same number.

**6. Test the setup**

After configuring forwarding, call the restaurant's main number:
- In Backup mode: let it ring past the no-answer threshold — the AI should pick up
- In Full mode: the AI should answer immediately

The dashboard will show a ✓ once the first forwarded call arrives.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `SESSION_SECRET` | Yes (prod) | Secret for JWT session cookies |
| `RESTAURANT_ACCOUNT_ID` | No | Defaults to `deensbistro_test` |
| `TWILIO_ACCOUNT_SID` | Voice | From [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Voice | From [console.twilio.com](https://console.twilio.com) |
| `TWILIO_PHONE_NUMBER` | Voice | Your Twilio number in E.164 |
| `TWILIO_TRANSFER_NUMBER` | Voice | Staff/manager transfer number in E.164 |

---

## Project Structure

```
app/
├── page.tsx              # Home: restaurant info
├── chat/page.tsx         # Customer chat simulator
├── menu/page.tsx         # Owner: menu editor
├── orders/page.tsx       # Owner: live orders
├── leads/page.tsx        # Owner: captured leads
├── settings/page.tsx     # Owner: hours, taxes, FAQs
└── api/
    ├── chat/route.ts     # AI conversation + tool execution (Anthropic)
    ├── menu/...          # Menu CRUD
    ├── hours/route.ts    # Hours get/update
    ├── taxes/route.ts    # Tax config
    ├── orders/...        # Orders list + complete
    └── leads/route.ts    # Leads list

lib/
├── data/deens-bistro.ts  # Seed data (restaurant, menu, FAQs)
├── store/                # In-memory state (menu, orders, leads, hours, taxes)
├── ai/
│   ├── context.ts        # Builds live restaurant context for the prompt
│   ├── prompts.ts        # System prompt + behavior rules
│   ├── tools.ts          # Tool definitions (OpenAI-schema format, converted in route)
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

## Roadmap

**Phase 1 — Voice core (in progress)**
- [x] Switch AI provider to Claude
- [ ] Twilio ConversationRelay WebSocket server
- [ ] Staff transfer via Twilio `<Dial>` with fallback
- [ ] SMS order tickets to owner
- [ ] Backup/Full forwarding mode config
- [ ] Call logs with transcripts

**Phase 2 — Multi-tenant + billing**
- [ ] Postgres/Supabase (schema is swap-ready)
- [ ] Self-serve onboarding (menu upload → review → Twilio number)
- [ ] Stripe subscription ($99/mo, minute cap, overage)

**Phase 3 — Sales & polish**
- [ ] Rebrand
- [ ] ROI dashboard (missed calls recovered, estimated revenue)
- [ ] Marketing landing page + public demo number
- [ ] Multilingual (EN/ES/AR/UR)
- [ ] A2P 10DLC compliance scaffolding

## License

Private — all rights reserved.
