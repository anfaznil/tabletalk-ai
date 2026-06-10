const colors: Record<string, string> = {
  default: "bg-stone-100 text-stone-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: keyof typeof colors;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}
