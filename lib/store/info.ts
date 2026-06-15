import { deensBistro } from "@/lib/data/deens-bistro";
import { loadPersisted, savePersisted } from "@/lib/store/persist";

export interface StoreInfo {
  name: string;
  phone: string;
  address: string;
  website: string;
  catering_available: boolean;
  /** Logo stored as a data URL (small images only) or null when unset. */
  logo_data_url: string | null;
}

/** ~1.5MB of base64 ≈ 1MB image — plenty for a logo. */
const MAX_LOGO_LENGTH = 1_500_000;

function seedInfo(): StoreInfo {
  return {
    name: deensBistro.name,
    phone: deensBistro.phone,
    address: deensBistro.address,
    website: deensBistro.website,
    catering_available: deensBistro.catering_available,
    logo_data_url: null,
  };
}

const globalStore = globalThis as unknown as { storeInfo: StoreInfo };

if (!globalStore.storeInfo) {
  // Merge over seed defaults so older persisted files pick up new fields.
  globalStore.storeInfo = { ...seedInfo(), ...loadPersisted("storeInfo", seedInfo) };
}

export function getStoreInfo(): StoreInfo {
  return globalStore.storeInfo;
}

export function updateStoreInfo(updates: Partial<StoreInfo>): {
  info: StoreInfo;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const next = { ...globalStore.storeInfo };

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) errors.name = "Name is required";
    else next.name = name;
  }
  if (updates.phone !== undefined) next.phone = updates.phone.trim();
  if (updates.address !== undefined) next.address = updates.address.trim();
  if (updates.website !== undefined) next.website = updates.website.trim();
  if (updates.catering_available !== undefined) {
    next.catering_available = Boolean(updates.catering_available);
  }
  if (updates.logo_data_url !== undefined) {
    if (updates.logo_data_url === null || updates.logo_data_url === "") {
      next.logo_data_url = null;
    } else if (!updates.logo_data_url.startsWith("data:image/")) {
      errors.logo_data_url = "Logo must be an image file";
    } else if (updates.logo_data_url.length > MAX_LOGO_LENGTH) {
      errors.logo_data_url = "Logo image is too large (max ~1MB)";
    } else {
      next.logo_data_url = updates.logo_data_url;
    }
  }

  if (Object.keys(errors).length === 0) {
    globalStore.storeInfo = next;
    savePersisted("storeInfo", globalStore.storeInfo);
  }

  return { info: globalStore.storeInfo, errors };
}
