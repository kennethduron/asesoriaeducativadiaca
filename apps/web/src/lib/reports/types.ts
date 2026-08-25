import { z } from "zod";
import { reportTypes } from "./config";

export const reportDataSchema = z.object({
  type: z.enum(reportTypes),
  total_count: z.coerce.number().int().nonnegative(),
  summary: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.record(z.string(), z.unknown())),
  ]),
  rows: z.array(z.record(z.string(), z.unknown())),
});
export type ReportData = z.infer<typeof reportDataSchema>;
