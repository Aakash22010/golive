import { z } from "zod";

export const tokenRequestSchema = z.object({
  room: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Room must be alphanumeric, dash or underscore"),
});

export const startRecordingSchema = z.object({
  room: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const stopRecordingSchema = z.object({
  egressId: z.string().min(1).max(128),
});

export const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "admin"]),
});
