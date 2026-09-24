import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export interface VerifiedUser {
  restaurant_id: string;
  restaurantSlug: string;
  username: string;
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<VerifiedUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { restaurant: { select: { id: true, slug: true } } },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  return {
    restaurant_id: user.restaurant.id,
    restaurantSlug: user.restaurant.slug,
    username: user.username,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
