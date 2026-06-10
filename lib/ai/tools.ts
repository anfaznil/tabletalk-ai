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

const orderItemsField = {
  type: "array",
  items: {
    type: "object",
    properties: {
      menu_item_id: {
        type: "string",
        description: "Menu item id from restaurant data",
      },
      quantity: { type: "integer", minimum: 1 },
    },
    required: ["menu_item_id", "quantity"],
  },
};

export const aiTools = [
  {
    type: "function" as const,
    function: {
      name: "quote_ready_time",
      description:
        "Calculate when an order will be ready (clock time). Accounts for rush hour. ALWAYS use before telling a customer when food will be ready.",
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
        "Calculate the exact order total with tax included. ALWAYS call this before telling a customer any price — never do the math yourself.",
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
        "Save a pickup order the kitchen should prepare. Only include items the customer explicitly ordered that exist on the menu — never substitute (e.g. soda is Can of Soda, not Mango Lassi).",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer name for pickup" },
          phone: {
            type: "string",
            description: "Only if customer voluntarily gives a phone number",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                menu_item_id: {
                  type: "string",
                  description: "Menu item id from restaurant data",
                },
                quantity: { type: "integer", minimum: 1 },
                notes: {
                  type: "string",
                  description: "Item-specific notes e.g. no onions",
                },
              },
              required: ["menu_item_id", "quantity"],
            },
          },
          notes: { type: "string", description: "Order-level notes" },
        },
        required: ["customer_name", "items"],
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
