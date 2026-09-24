import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

function toFaq(row: { id: string; question: string; answer: string }): FAQ {
  return { id: row.id, question: row.question, answer: row.answer };
}

export async function getFaqs(): Promise<FAQ[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.faq.findMany({
    where: { restaurant_id: rid },
    orderBy: { position: "asc" },
  });
  return rows.map(toFaq);
}

export async function addFaq(input: Omit<FAQ, "id">): Promise<FAQ> {
  const rid = await getRestaurantId();
  const agg = await prisma.faq.aggregate({ where: { restaurant_id: rid }, _max: { position: true } });
  const row = await prisma.faq.create({
    data: {
      restaurant_id: rid,
      question: input.question,
      answer: input.answer,
      position: (agg._max.position ?? -1) + 1,
    },
  });
  return toFaq(row);
}

export async function updateFaq(id: string, updates: Partial<Omit<FAQ, "id">>): Promise<FAQ | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.faq.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return null;
  const row = await prisma.faq.update({
    where: { id },
    data: {
      question: updates.question ?? existing.question,
      answer: updates.answer ?? existing.answer,
    },
  });
  return toFaq(row);
}

export async function deleteFaq(id: string): Promise<boolean> {
  const rid = await getRestaurantId();
  const existing = await prisma.faq.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return false;
  await prisma.faq.delete({ where: { id } });
  return true;
}
