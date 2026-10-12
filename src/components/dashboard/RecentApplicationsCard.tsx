import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { getJobStatusBadgeColor } from "@/lib/badge-colors";
import type { JobResponse } from "@/models/job.model";

export default function RecentApplicationsCard({ jobs, unavailable = false }: {
  jobs: JobResponse[];
  unavailable?: boolean;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-4 border-b">
        <CardTitle className="text-base">Recent applications</CardTitle>
        <Link href="/dashboard/myjobs" className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          View all <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {unavailable ? (
          <p className="p-5 text-sm text-muted-foreground" role="status">Applications are unavailable. Try opening Jobs.</p>
        ) : jobs.length ? (
          <ul className="divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/dashboard/myjobs/${job.id}`} className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/60">
                  <Avatar className="mt-0.5 size-9 shrink-0 rounded-lg border bg-muted">
                    <AvatarImage src={job.Company?.logoUrl} alt="" />
                    <AvatarFallback className="rounded-lg text-xs">{job.Company?.label?.slice(0, 2).toUpperCase() || "JS"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5 [overflow-wrap:anywhere]">{job.JobTitle?.label || "Untitled job"}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                      {job.Company?.label || "Unknown company"}{job.Location?.label ? ` · ${job.Location.label}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 @lg/main:hidden">
                      {job.Status?.label && <StatusBadge label={job.Status.label} color={getJobStatusBadgeColor(job.Status.value)} />}
                      <span className="text-xs text-muted-foreground">{job.appliedDate ? format(job.appliedDate, "MMM d, yyyy") : "No application date"}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-2 @lg/main:flex">
                    {job.Status?.label && <StatusBadge label={job.Status.label} color={getJobStatusBadgeColor(job.Status.value)} />}
                    <span className="text-xs tabular-nums text-muted-foreground">{job.appliedDate ? format(job.appliedDate, "MMM d, yyyy") : "No application date"}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <BriefcaseBusiness className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <p className="text-sm font-medium">No applications yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">Your recent applications will appear here once you start tracking them.</p>
            <Link href="/dashboard/myjobs?add-job=true" className="text-sm font-medium underline underline-offset-4">Add your first application</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
