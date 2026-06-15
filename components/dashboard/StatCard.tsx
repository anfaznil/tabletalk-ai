export function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[140px] flex-col rounded-xl border border-stone-200 bg-white p-5">
      <p className="flex items-center gap-1.5 text-sm text-stone-600">
        {label}
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 text-[10px] font-medium text-stone-400"
          title={description}
          aria-label={description}
        >
          i
        </span>
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-stone-900">
        {value}
      </p>
      <p className="mt-auto pt-4 text-xs text-stone-400">{description}</p>
    </div>
  );
}
