export function compactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "n/a";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fullNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "n/a";
  return n.toLocaleString("en-US");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function repoAge(createdAt: string | undefined): string {
  if (!createdAt) return "n/a";
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days < 31) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months ? `${years}y ${months}m` : `${years} years`;
}
