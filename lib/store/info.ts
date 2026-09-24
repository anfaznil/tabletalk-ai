import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export interface StoreInfo {
  name: string;
  phone: string;
  address: string;
  website: string;
  catering_available: boolean;
  logo_data_url: string | null;
}

const MAX_LOGO_LENGTH = 1_500_000;

function toInfo(row: {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  catering_available: boolean;
  logo_data_url: string | null;
}): StoreInfo {
  return {
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    website: row.website ?? "",
    catering_available: row.catering_available,
    logo_data_url: row.logo_data_url,
  };
}

export async function getStoreInfo(): Promise<StoreInfo> {
  const rid = await getRestaurantId();
  const row = await prisma.restaurant.findUniqueOrThrow({
    where: { id: rid },
    select: {
      name: true,
      phone: true,
      address: true,
      website: true,
      catering_available: true,
      logo_data_url: true,
    },
  });
  return toInfo(row);
}

export async function updateStoreInfo(updates: Partial<StoreInfo>): Promise<{
  info: StoreInfo;
  errors: Record<string, string>;
}> {
  const rid = await getRestaurantId();
  const current = await getStoreInfo();
  const errors: Record<string, string> = {};
  const next = { ...current };

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
    await prisma.restaurant.update({
      where: { id: rid },
      data: {
        name: next.name,
        phone: next.phone || null,
        address: next.address || null,
        website: next.website || null,
        catering_available: next.catering_available,
        logo_data_url: next.logo_data_url,
      },
    });
  }

  return { info: Object.keys(errors).length === 0 ? next : current, errors };
}
