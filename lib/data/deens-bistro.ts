export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prep_time_minutes: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Restaurant {
  name: string;
  slug: string;
  phone: string;
  address: string;
  website: string;
  hours: Record<string, string>;
  catering_available: boolean;
  menu_items: MenuItem[];
  faqs: FAQ[];
}

export const deensBistro: Restaurant = {
  name: "Deen's Bistro",
  slug: "deens-bistro",
  phone: "(718) 555-0142",
  address: "142 Atlantic Avenue, Brooklyn, NY 11201",
  website: "https://deensbistro.com",
  hours: {
    mon: "11:00 AM – 9:00 PM",
    tue: "11:00 AM – 9:00 PM",
    wed: "11:00 AM – 9:00 PM",
    thu: "11:00 AM – 10:00 PM",
    fri: "11:00 AM – 10:00 PM",
    sat: "10:00 AM – 10:00 PM",
    sun: "10:00 AM – 9:00 PM",
  },
  catering_available: true,
  menu_items: [
    {
      id: "menu-1",
      name: "Chicken Over Rice",
      description: "Halal marinated chicken over seasoned rice with white sauce and salad",
      price: 12.99,
      category: "Plates",
      prep_time_minutes: 10,
    },
    {
      id: "menu-2",
      name: "Gyro Over Rice",
      description: "Seasoned halal gyro meat over rice with tzatziki and salad",
      price: 13.99,
      category: "Plates",
      prep_time_minutes: 10,
    },
    {
      id: "menu-3",
      name: "Falafel Over Rice",
      description: "Crispy falafel over rice with hummus, salad, and tahini",
      price: 11.99,
      category: "Plates",
      prep_time_minutes: 10,
    },
    {
      id: "menu-9",
      name: "Fried Chicken (3 pc)",
      description: "Crispy halal fried chicken — made to order",
      price: 11.99,
      category: "Plates",
      prep_time_minutes: 20,
    },
    {
      id: "menu-4",
      name: "Lamb Gyro",
      description: "Halal lamb gyro in warm pita with tomatoes, onions, and tzatziki",
      price: 10.99,
      category: "Sandwiches",
      prep_time_minutes: 8,
    },
    {
      id: "menu-5",
      name: "Chicken Shawarma Wrap",
      description: "Marinated chicken shawarma with garlic sauce in lavash wrap",
      price: 9.99,
      category: "Sandwiches",
      prep_time_minutes: 8,
    },
    {
      id: "menu-10",
      name: "Cheeseburger",
      description: "Halal beef patty with cheese, lettuce, tomato on a brioche bun",
      price: 9.49,
      category: "Sandwiches",
      prep_time_minutes: 5,
    },
    {
      id: "menu-6",
      name: "Mango Lassi",
      description: "Creamy mango yogurt drink",
      price: 4.99,
      category: "Drinks",
      prep_time_minutes: 2,
    },
    {
      id: "menu-11",
      name: "Can of Soda",
      description: "Coca-Cola, Sprite, or similar canned soda",
      price: 2.49,
      category: "Drinks",
      prep_time_minutes: 1,
    },
    {
      id: "menu-7",
      name: "Family Platter",
      description: "Mixed meats, rice, salads, and breads — feeds 4–6",
      price: 54.99,
      category: "Platters",
      prep_time_minutes: 15,
    },
    {
      id: "menu-8",
      name: "Catering Tray (20 servings)",
      description: "Choice of chicken, gyro, or falafel over rice — ideal for offices and events",
      price: 189.99,
      category: "Catering",
      prep_time_minutes: 45,
    },
  ],
  faqs: [
    {
      id: "faq-1",
      question: "Are you halal?",
      answer: "Yes, all of our meat is 100% halal certified.",
    },
    {
      id: "faq-2",
      question: "Do you offer catering?",
      answer:
        "Yes! We cater office lunches, family events, and celebrations. Trays start at 20 servings. Call us or leave your details and we'll follow up.",
    },
    {
      id: "faq-3",
      question: "Do you have vegetarian options?",
      answer:
        "Absolutely. Our falafel over rice, falafel wrap, and hummus sides are popular vegetarian choices.",
    },
    {
      id: "faq-4",
      question: "What are your hours?",
      answer:
        "We're open Monday–Thursday 11 AM–9 PM, Friday 11 AM–10 PM, and weekends 10 AM–10 PM (Sunday until 9 PM).",
    },
    {
      id: "faq-5",
      question: "Do you deliver?",
      answer:
        "We are pickup only at the moment. You can place orders for pickup at our Atlantic Avenue location.",
    },
    {
      id: "faq-6",
      question: "Where are you located?",
      answer: "We're at 142 Atlantic Avenue in Brooklyn, near the Barclays Center.",
    },
    {
      id: "faq-7",
      question: "Is tax included in the price?",
      answer: "Tax is included in the total we quote you at checkout.",
    },
  ],
};
