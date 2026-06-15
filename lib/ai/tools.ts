const leadFields = {
  type: "object",
  properties: {
    customer_name: { type: "string", description: "Customer name for the order" },
    phone: {
      type: "string",
      description: "Customer phone number — only if they voluntarily provide one",
    },
    event_date: {
      type: "string",
      description: "Date of the event or when food is needed",
    },
    guest_count: {
      type: "integer",
      description: "Estimated number of guests or people to feed",
    },
    notes: {
      type: "string",
      description: "Additional details about the request",
    },
  },
  required: ["customer_name", "event_date", "guest_count"],
};

const orderLineItemSchema = {
  type: "object",
  properties: {
    menu_item_id: {
      type: "string",
      description: "Menu item id from restaurant data",
    },
    quantity: { type: "integer", minimum: 1 },
    customization_ids: {
      type: "array",
      items: { type: "string" },
      description:
        "Customization ids from CUSTOMIZATIONS that apply to this menu item (e.g. extra sauce, toppings)",
    },
    notes: {
      type: "string",
      description: "Free-text notes only if no matching customization exists",
    },
  },
  required: ["menu_item_id", "quantity"],
};

const orderItemsField = {
  type: "array",
  items: orderLineItemSchema,
};

export const aiTools = [
  {
    type: "function" as const,
    function: {
      name: "quote_ready_time",
      description:
        "Calculate how long an order will take (minutes) and the kitchen ready-by time. Accounts for rush hour. ALWAYS use before telling a customer how long their food will take.",
      parameters: {
        type: "object",
        properties: {
          items: orderItemsField,
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "quote_order_total",
      description:
        "Calculate the exact order total with tax included. Only call when the customer explicitly asks about price, cost, or total — never proactively.",
      parameters: {
        type: "object",
        properties: {
          items: orderItemsField,
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capture_order",
      description:
        "Save a pickup order the kitchen should prepare. Only call AFTER the customer has confirmed the order items AND provided their name. Only include items the customer explicitly ordered that exist on the menu — never substitute (e.g. soda is Can of Soda, not Mango Lassi).",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer name for pickup" },
          phone: {
            type: "string",
            description: "Only if customer voluntarily gives a phone number",
          },
          items: orderItemsField,
          notes: { type: "string", description: "Order-level notes" },
        },
        required: ["customer_name", "items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_customer_orders",
      description:
        "Find previous orders by customer name. Use only when a customer wants to CHECK order status — not to change, cancel, or add items (those go to transfer_to_staff). If they already introduced themselves (e.g. 'this is Sir'), use that name — do not ask again.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "Customer name to search for — use the name they already gave if available",
          },
        },
        required: ["customer_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transfer_to_staff",
      description:
        "Transfer the customer to a human employee at the restaurant. Required when a customer calls back to change, cancel, add, or remove items on an existing order — you cannot modify orders yourself. Also use for complaints or anything requiring a manager.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Why the transfer is needed, e.g. cancel_order, complaint, speak_to_manager",
          },
          customer_name: {
            type: "string",
            description: "Customer name if known",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capture_catering_lead",
      description:
        "Save a catering inquiry for future events. Not for immediate menu orders.",
      parameters: leadFields,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capture_large_order_lead",
      description:
        "Save a large future order inquiry needing staff planning (bulk platters, big events). Not for immediate same-day menu orders.",
      parameters: leadFields,
    },
  },
];
