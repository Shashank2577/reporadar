import Link from "next/link";

export default function Tag({ label, href }: { label: string; href?: string }) {
  const cls =
    "inline-block rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-accent hover:bg-border/40";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {label}
      </Link>
    );
  }
  return <span className={cls}>{label}</span>;
}
