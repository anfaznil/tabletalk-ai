export function StoreLogo({
  src,
  alt,
  size = "md",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  if (!src) {
    return (
      <div
        className={`${dim} shrink-0 rounded-lg border border-dashed border-white/20 bg-white/5 ${className}`}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${dim} shrink-0 rounded-lg border border-white/10 object-cover ${className}`}
    />
  );
}
