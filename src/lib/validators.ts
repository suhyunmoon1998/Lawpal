import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createCaseSchema = z.object({
  name: z.string().min(2),
  caseNumber: z.string().optional(),
  courtName: z.string().optional(),
  judgeName: z.string().optional(),
  department: z.string().optional(),
  aliases: z.array(z.string()).default([])
});

export const assignEmailSchema = z.object({
  emailId: z.string().min(1),
  caseMatterId: z.string().min(1)
});

export const updateCaseStatusSchema = z.object({
  caseMatterId: z.string().min(1),
  status: z.enum(["ACTIVE", "PENDING", "CLOSED", "ARCHIVED"])
});

export const approvalDecisionSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["DRAFT_DEADLINE", "CASE_DOCUMENT_VERSION", "CALENDAR_EVENT"]),
  decision: z.enum(["ATTORNEY_APPROVED", "REJECTED", "NEEDS_CORRECTION", "LOCKED_FOR_COURT_USE"]),
  comment: z.string().optional()
});

export const aiChatRequestSchema = z.object({
  pathname: z.string().optional(),
  mascot: z.enum(["bear", "cat", "dog"]).default("bear"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000)
      })
    )
    .min(1)
    .max(24)
});
