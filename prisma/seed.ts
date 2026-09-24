/**
 * Seed script — creates the Deen's Bistro test restaurant with its full data.
 * Run with: npm run db:seed
 *
 * Safe to re-run: skips if the restaurant slug already exists.
 */

import { PrismaClient } from "@prisma/client";
import { deensBistro } from "../lib/data/deens-bistro";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  const existing = await prisma.restaurant.findUnique({
    where: { slug: deensBistro.slug },
  });

  if (existing) {
    console.log(`Restaurant "${deensBistro.name}" already exists — skipping seed.`);
    return;
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: deensBistro.name,
      slug: deensBistro.slug,
      phone: deensBistro.phone,
      address: deensBistro.address,
      website: deensBistro.website,
      catering_available: deensBistro.catering_available,

      users: {
        create: {
          username: "admin",
          password_hash: await hashPassword("admin"),
        },
      },

      hours: {
        create: {
          mon: deensBistro.hours.mon,
          tue: deensBistro.hours.tue,
          wed: deensBistro.hours.wed,
          thu: deensBistro.hours.thu,
          fri: deensBistro.hours.fri,
          sat: deensBistro.hours.sat,
          sun: deensBistro.hours.sun,
        },
      },

      taxRates: {
        create: {
          food_beverage_rate: 0.06,
          sales_rate: 0.053,
        },
      },

      voiceSettings: {
        create: {
          mode: "backup",
          transfer_number: "",
          mode_verified: false,
        },
      },

      subscription: {
        create: {
          plan: "standard",
          status: "trialing",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          minute_cap: 500,
          minutes_used: 0,
        },
      },
    },
  });

  // Seed menu categories (derived from item categories, preserving order).
  const categories = Array.from(
    new Map(
      deensBistro.menu_items.map((item) => [item.category, item.category])
    ).values()
  );

  await prisma.menuCategory.createMany({
    data: categories.map((name, position) => ({
      restaurant_id: restaurant.id,
      name,
      position,
    })),
  });

  // Seed menu items.
  for (const item of deensBistro.menu_items) {
    await prisma.menuItem.create({
      data: {
        id: item.id,
        restaurant_id: restaurant.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        prep_time_minutes: item.prep_time_minutes,
        availability: item.availability ?? "in_stock",
        position: item.sort_order ?? 0,
      },
    });
  }

  // Seed FAQs.
  await prisma.faq.createMany({
    data: deensBistro.faqs.map((faq, position) => ({
      id: faq.id,
      restaurant_id: restaurant.id,
      question: faq.question,
      answer: faq.answer,
      position,
    })),
  });

  console.log(`Seeded "${restaurant.name}" (id: ${restaurant.id})`);
  console.log("Login: admin / admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
