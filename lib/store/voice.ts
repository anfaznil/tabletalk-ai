/**
 * Voice / call-forwarding configuration for the restaurant.
 */

import { loadPersisted, savePersisted } from "@/lib/store/persist";

export type ForwardingMode = "backup" | "full";

export interface VoiceSettings {
  /**
   * backup: carrier forwards on no-answer/busy only — staff answer when they can.
   * full:   carrier forwards all calls — AI answers everything.
   */
  mode: ForwardingMode;
  /** Staff / manager transfer number (must differ from the restaurant's main line). */
  transfer_number: string;
  /** True after the owner has confirmed a test call came through for the current mode. */
  mode_verified: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  mode: "backup",
  transfer_number: "",
  mode_verified: false,
};

const globalStore = globalThis as unknown as { voiceSettings: VoiceSettings };

if (!globalStore.voiceSettings) {
  globalStore.voiceSettings = {
    ...DEFAULT_SETTINGS,
    ...loadPersisted("voiceSettings", () => DEFAULT_SETTINGS),
  };
}

export function getVoiceSettings(): VoiceSettings {
  return globalStore.voiceSettings;
}

export function updateVoiceSettings(updates: Partial<VoiceSettings>): {
  settings: VoiceSettings;
  error?: string;
} {
  const next = { ...globalStore.voiceSettings };

  if (updates.mode !== undefined) {
    if (updates.mode !== "backup" && updates.mode !== "full") {
      return { settings: globalStore.voiceSettings, error: "mode must be 'backup' or 'full'" };
    }
    // Changing mode resets verification — owner must complete a test call.
    if (updates.mode !== next.mode) {
      next.mode_verified = false;
    }
    next.mode = updates.mode;
  }

  if (updates.transfer_number !== undefined) {
    const num = updates.transfer_number.trim();
    const mainLine = process.env.TWILIO_PHONE_NUMBER ?? "";
    // In Full mode, forwarding back to the main Twilio number would loop.
    if (next.mode === "full" && mainLine && num === mainLine) {
      return {
        settings: globalStore.voiceSettings,
        error:
          "Transfer number cannot be the same as the restaurant's Twilio number in Full mode — that would loop calls back to the AI. Use a different number (e.g. a manager's cell).",
      };
    }
    next.transfer_number = num;
  }

  if (updates.mode_verified !== undefined) {
    next.mode_verified = Boolean(updates.mode_verified);
  }

  globalStore.voiceSettings = next;
  savePersisted("voiceSettings", globalStore.voiceSettings);
  return { settings: globalStore.voiceSettings };
}
