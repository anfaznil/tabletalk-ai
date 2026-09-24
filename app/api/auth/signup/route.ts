import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/credentials";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      restaurantName?: string;
      username?: string;
      password?: string;
    };

    const restaurantName = body.restaurantName?.trim();
    const username = body.username?.trim();
    const password = body.password ?? "";

    const errors: Record<string, string> = {};
    if (!restaurantName) errors.restaurantName = "Restaurant name is required.";
    if (!username || username.length < 3) errors.username = "Username must be at least 3 characters.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";

    if (Object.keys(errors).length) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username: username! } });
    if (existingUser) {
      return NextResponse.json(
        { errors: { username: "Username is already taken." } },
        { status: 409 }
      );
    }

    const slug = await uniqueSlug(toSlug(restaurantName!));
    const password_hash = await hashPassword(password);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName!,
        slug,
        users: { create: { username: username!, password_hash } },
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

    const token = await createSessionToken({
      username: username!,
      restaurant_id: restaurant.id,
      restaurantSlug: restaurant.slug,
    });

    const response = NextResponse.json(
      { success: true, restaurantId: restaurant.id, slug: restaurant.slug },
      { status: 201 }
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
