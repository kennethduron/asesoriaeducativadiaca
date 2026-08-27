import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.email().trim().max(254),
  full_name: z.string().trim().min(2).max(120),
});

export const updateUserAccessSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "finance", "staff"]),
  status: z.enum(["active", "inactive"]),
});
