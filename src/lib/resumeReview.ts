import { z } from "zod";
import { ResumeScoresSchema, type ResumeReviewData } from "@/models/ai.schemas";

const savedReviewSchema = ResumeScoresSchema.extend({
  body: z.string(),
  reviewedAt: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  surface: z.string().optional(),
});

/** Parse the stored Profile review without interpreting incomplete data as a score. */
export function parseResumeReview(raw: string | null | undefined): ResumeReviewData | null {
  if (!raw) return null;
  try {
    const result = savedReviewSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
