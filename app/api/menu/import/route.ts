import { NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_IMAGE_LENGTH = 8_000_000; // ~6MB image as base64

interface ExtractedItem {
  name: string;
  description: string;
  price: number;
  category: string;
}

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("your_openai") || apiKey.includes("your-key")) {
      return NextResponse.json(
        { error: "OpenAI API key not configured." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract menu items from photos of restaurant menus. " +
            "Read every item that has a clearly readable name and price. " +
            "Use the menu's section headings as the category (e.g. Appetizers, Combos). " +
            "If an item has no visible description, use an empty string. " +
            "Prices must be plain numbers without currency symbols. " +
            "Skip items whose price you cannot read. Do not invent items.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all menu items from this menu photo.",
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_items",
          strict: true,
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string" },
                  },
                  required: ["name", "description", "price", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let items: ExtractedItem[] = [];
    try {
      items = (JSON.parse(raw).items ?? []) as ExtractedItem[];
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

    if (err instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: err.message || "OpenAI request failed." },
        { status: err.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
