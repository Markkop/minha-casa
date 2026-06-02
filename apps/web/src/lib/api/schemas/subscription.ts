import { z } from "zod";

const planSchema = z
  .object({
    id: z.string(),
    slug: z.string().optional(),
    name: z.string().optional(),
    isActive: z.boolean().optional()
  })
  .passthrough();

const subscriptionSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    planId: z.string().optional(),
    status: z.string(),
    expiresAt: z.union([z.string(), z.date()])
  })
  .passthrough();

export const subscriptionPayloadSchema = z.object({
  subscription: subscriptionSchema.nullable(),
  plan: planSchema.nullable()
});

export type SubscriptionPayload = z.infer<typeof subscriptionPayloadSchema>;
