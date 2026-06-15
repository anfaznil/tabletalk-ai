import { NextResponse } from "next/server";
import { addFaq, getFaqs, updateFaq } from "@/lib/store/faqs";

export async function GET() {
  return NextResponse.json(getFaqs());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { question, answer } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "question and answer are required" },
      { status: 400 }
    );
  }

  const faq = addFaq({ question: question.trim(), answer: answer.trim() });
  return NextResponse.json(faq, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, question, answer } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updates: { question?: string; answer?: string } = {};
  if (question !== undefined) updates.question = String(question).trim();
  if (answer !== undefined) updates.answer = String(answer).trim();

  const updated = updateFaq(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
