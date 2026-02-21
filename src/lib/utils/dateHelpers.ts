export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function daysAgo(days: number): number {
  return nowUnixSeconds() - days * 86400;
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
