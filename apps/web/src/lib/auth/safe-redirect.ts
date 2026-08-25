const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function toSafeInternalPath(
  candidate: string | null | undefined,
  fallback = "/admin",
) {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://diaca.invalid");
    if (parsed.origin !== "https://diaca.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
