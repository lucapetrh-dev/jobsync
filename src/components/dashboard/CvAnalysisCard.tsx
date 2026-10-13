import Link from "next/link";
import MarkdownIt from "markdown-it";
import { ArrowUpRight, FileText } from "lucide-react";
import { format, isValid } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentReviewScoreCard } from "@/components/agent/AgentReviewScoreCard";
import { parseResumeReview } from "@/lib/resumeReview";
import type { Resume } from "@/models/profile.model";

const markdown = new MarkdownIt({ html: false, linkify: false });

/** Keep feedback as plain text; the full formatted review remains in Profile. */
function feedbackPreview(body: string) {
  const text = markdown.parse(body, {}).flatMap((token, index, tokens) =>
    token.type === "inline" && tokens[index - 1]?.type !== "heading_open" ? (token.children ?? []).map((child) =>
      child.type === "text" || child.type === "code_inline" ? child.content : " ",
    ).join("") : [],
  ).join(" ").replace(/\s+/g, " ").trim();
  return text.length > 600 ? `${text.slice(0, 600).replace(/\s+\S*$/, "")}…` : text;
}

export default function CvAnalysisCard({ resume, unavailable = false }: {
  resume: Resume | null;
  unavailable?: boolean;
}) {
  const review = parseResumeReview(resume?.reviewData);
  const reviewedAt = review?.reviewedAt ? new Date(review.reviewedAt) : null;
  const preview = review ? feedbackPreview(review.body) : "";
  const profileHref = resume?.id ? `/dashboard/profile/resume/${resume.id}${review ? "#cv-review" : ""}` : "/dashboard/profile";

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b"><CardTitle className="text-base">CV analysis</CardTitle></CardHeader>
      <CardContent className="space-y-5 pt-5">
        {unavailable ? (
          <p className="text-sm text-muted-foreground" role="status">CV analysis is unavailable. Try opening Profile.</p>
        ) : resume ? (
          <>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2"><FileText className="size-4 text-muted-foreground" aria-hidden /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium [overflow-wrap:anywhere]">{resume.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">Default CV</p>
              </div>
            </div>
            {review ? (
              <>
                <AgentReviewScoreCard scores={review} size={180} />
                {reviewedAt && isValid(reviewedAt) && <p className="text-xs text-muted-foreground">Reviewed {format(reviewedAt, "MMM d, yyyy")}</p>}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Saved feedback</p>
                  <p className="line-clamp-6 text-sm leading-relaxed [overflow-wrap:anywhere]">{preview || "Open Profile to view the saved review."}</p>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">No saved analysis yet.</p>}
          </>
        ) : <p className="text-sm leading-relaxed text-muted-foreground">Choose a default CV in Profile to see its analysis here.</p>}
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={profileHref} className="inline-flex items-center gap-1 text-sm font-medium hover:underline underline-offset-4">
          {resume ? "Open in Profile" : "Open Profile"}<ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}
