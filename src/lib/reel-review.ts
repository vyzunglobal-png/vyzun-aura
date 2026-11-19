/** Outcome of an AI Reel check: approved Reels go live, removed ones never show. */
export type ReelVerdict = "approved" | "removed";

/**
 * Reads the AI's JSON answer. Anything that is not a clear yes/no returns null,
 * so the Reel stays pending instead of being published by mistake.
 */
export function parseReelVerdict(raw: string): ReelVerdict | null {
  const text = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && "allowed" in value && typeof value.allowed === "boolean") {
      return value.allowed ? "approved" : "removed";
    }
  } catch {
    /* fall through */
  }
  return null;
}
