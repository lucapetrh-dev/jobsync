import { getActivityCalendarData, getRecentJobs } from "@/actions/dashboard.actions";
import { getDefaultResumeId, getResumeById } from "@/actions/profile.actions";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import RecentApplicationsCard from "@/components/dashboard/RecentApplicationsCard";
import CvAnalysisCard from "@/components/dashboard/CvAnalysisCard";
import DashboardActions from "@/components/dashboard/DashboardActions";
import type { Metadata } from "next";
import type { Resume } from "@/models/profile.model";

export const metadata: Metadata = { title: "Dashboard" };

async function readDefaultResume(): Promise<Resume | null> {
  const id = await getDefaultResumeId();
  if (!id) return null;
  const result = await getResumeById(id);
  if (!result?.success) throw new Error("Failed to load default CV");
  return result.data ?? null;
}

export default async function Dashboard() {
  const [jobs, resume, calendar] = await Promise.allSettled([
    getRecentJobs(), readDefaultResume(), getActivityCalendarData(),
  ]);
  const calendarData = calendar.status === "fulfilled" ? calendar.value : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your applications and CV, at a glance.</p>
        </div>
        <DashboardActions />
      </div>
      <div className="grid items-start gap-5 @4xl/main:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecentApplicationsCard jobs={jobs.status === "fulfilled" ? jobs.value ?? [] : []} unavailable={jobs.status === "rejected"} />
        <CvAnalysisCard resume={resume.status === "fulfilled" ? resume.value : null} unavailable={resume.status === "rejected"} />
      </div>
      {calendarData ? <ActivityCalendar years={Object.keys(calendarData)} dataByYear={calendarData} /> : (
        <p role="status" className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Activity calendar is unavailable. Please try again later.</p>
      )}
    </div>
  );
}
