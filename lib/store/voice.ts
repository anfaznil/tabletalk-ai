import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export type ForwardingMode = "backup" | "full";

export interface VoiceSettings {
  mode: ForwardingMode;
  transfer_number: string;
  mode_verified: boolean;
}

function toSettings(row: {
  mode: string;
  transfer_number: string;
  mode_verified: boolean;
}): VoiceSettings {
  return {
    mode: (row.mode === "full" ? "full" : "backup") as ForwardingMode,
    transfer_number: row.transfer_number,
    mode_verified: row.mode_verified,
  };
}

const DEFAULT_SETTINGS: VoiceSettings = {
  mode: "backup",
  transfer_number: "",
  mode_verified: false,
};

export async function getVoiceSettings(): Promise<VoiceSettings> {
  const rid = await getRestaurantId();
  const row = await prisma.voiceSettings.findUnique({ where: { restaurant_id: rid } });
  return row ? toSettings(row) : { ...DEFAULT_SETTINGS };
}

export async function updateVoiceSettings(updates: Partial<VoiceSettings>): Promise<{
  settings: VoiceSettings;
  error?: string;
}> {
  const rid = await getRestaurantId();
  const current = await getVoiceSettings();
  const next = { ...current };

  if (updates.mode !== undefined) {
    if (updates.mode !== "backup" && updates.mode !== "full") {
      return { settings: current, error: "mode must be 'backup' or 'full'" };
    }
    if (updates.mode !== next.mode) next.mode_verified = false;
    next.mode = updates.mode;
  }

  if (updates.transfer_number !== undefined) {
    const num = updates.transfer_number.trim();
    const mainLine = process.env.TWILIO_PHONE_NUMBER ?? "";
    if (next.mode === "full" && mainLine && num === mainLine) {
      return {
        settings: current,
        error:
          "Transfer number cannot be the same as the restaurant's Twilio number in Full mode — that would loop calls back to the AI. Use a different number (e.g. a manager's cell).",
      };
    }
    next.transfer_number = num;
  }

  if (updates.mode_verified !== undefined) {
    next.mode_verified = Boolean(updates.mode_verified);
  }

  const row = await prisma.voiceSettings.upsert({
    where: { restaurant_id: rid },
    create: { restaurant_id: rid, ...next },
    update: next,
  });
  return { settings: toSettings(row) };
}
