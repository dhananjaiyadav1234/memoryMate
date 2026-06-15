/**
 * Convert a date string to a human-readable relative time.
 * "just now", "3m ago", "2h ago", "yesterday", "5 days ago", "Jan 12"
 */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `${hrs}h ago`;
  }
  if (diffSec < 172800) return "yesterday";
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return `${days} days ago`;
  }
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Convert a date string to a spoken relative last met text.
 * "today", "yesterday", "X days ago"
 */
export function getLastMetSpeechText(dateString?: string): string {
  if (!dateString) return "today";
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  const diffDays = Math.floor(diffSec / 86400);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}
