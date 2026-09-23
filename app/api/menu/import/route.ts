import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MAX_IMAGE_LENGTH = 8_000_000; // ~6MB image as base64

interface ExtractedItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

const EXTRACTION_PROMPT = `Extract all menu items from this menu photo.
Return a JSON object: { "items": [ { "name": string, "description": string, "price": number, "category": string } ] }
Rules:
- Use section headings as category (e.g. Appetizers, Combos).
- Prices must be plain numbers, no currency symbols.
- If an item has no visible description, use "".
- Skip items whose price you cannot read. Do not invent items.
- Return ONLY the JSON object, no markdown fences.`;

export async function POST(request: Request) {
  try {
    const { image } = (await request.json()) as { image?: string };

    if (!image?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "An image file is required" },
        { status: 400 }
      );
    }
    if (image.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json(
        { error: "Image is too large — max 6MB" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith("your")) {
      return NextResponse.json(
        { error: "Anthropic API key not configured." },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Extract media type and base64 data from the data URI.
    const [header, base64Data] = image.split(",");
    const mediaTypeMatch = header.match(/data:([^;]+);base64/);
    const mediaType = (mediaTypeMatch?.[1] ?? "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let items: ExtractedItem[] = [];
    try {
      // Strip markdown fences if the model added them anyway.
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      items = (JSON.parse(cleaned).items ?? []) as ExtractedItem[];
    } catch {
      return NextResponse.json(
        { error: "Couldn't read menu items from that photo. Try a clearer one." },
        { status: 422 }
      );
    }

    items = items.filter(
      (item) =>
        item.name?.trim() &&
        typeof item.price === "number" &&
        item.price > 0
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No menu items found in that photo. Try a clearer one." },
        { status: 422 }
      );
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Menu import error:", err);

    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message || "Anthropic request failed." },
        { status: err.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
