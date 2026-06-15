import { deensBistro, type FAQ } from "@/lib/data/deens-bistro";
import { loadPersisted, savePersisted } from "@/lib/store/persist";

const globalStore = globalThis as unknown as { faqs: FAQ[] };

if (!globalStore.faqs) {
  globalStore.faqs = loadPersisted("faqs", () =>
    deensBistro.faqs.map((faq) => ({ ...faq }))
  );
}

function persist() {
  savePersisted("faqs", globalStore.faqs);
}

export function getFaqs(): FAQ[] {
  return globalStore.faqs;
}

export function addFaq(input: Omit<FAQ, "id">): FAQ {
  const faq: FAQ = {
    ...input,
    id: `faq-${crypto.randomUUID().slice(0, 8)}`,
  };
  globalStore.faqs.push(faq);
  persist();
  return faq;
}

export function updateFaq(
  id: string,
  updates: Partial<Omit<FAQ, "id">>
): FAQ | null {
  const index = globalStore.faqs.findIndex((faq) => faq.id === id);
  if (index === -1) return null;

  globalStore.faqs[index] = { ...globalStore.faqs[index], ...updates };
  persist();
  return globalStore.faqs[index];
}

export function deleteFaq(id: string): boolean {
  const index = globalStore.faqs.findIndex((faq) => faq.id === id);
  if (index === -1) return false;
  globalStore.faqs.splice(index, 1);
  persist();
  return true;
}
