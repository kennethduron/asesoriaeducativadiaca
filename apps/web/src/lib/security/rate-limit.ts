import "server-only";

import { createHash } from "node:crypto";

import { createClient } from "@/lib/supabase/server";

export async function consumeRateLimit(input: {
  scope: string;
  subject: string;
  windowSeconds: number;
  maxRequests: number;
}) {
  const secret = process.env.RATE_LIMIT_SECRET?.trim();
  if (!secret) throw new Error("RATE_LIMIT_NOT_CONFIGURED");
  const subjectHash = createHash("sha256")
    .update(`${secret}:${input.subject}`)
    .digest("hex");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    bucket_scope: input.scope,
    bucket_subject_hash: subjectHash,
    window_seconds: input.windowSeconds,
    max_requests: input.maxRequests,
  });
  if (error || !data?.[0]) throw new Error("RATE_LIMIT_UNAVAILABLE");
  return data[0];
}

export function requestSubject(headers: Pick<Headers, "get">) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
