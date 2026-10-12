import { render, screen } from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { getRecentJobs } from "@/actions/dashboard.actions";
import { getDefaultResumeId, getResumeById } from "@/actions/profile.actions";

vi.mock("@/actions/dashboard.actions", () => ({
  getRecentJobs: vi.fn().mockResolvedValue([]),
  getRecentActivities: vi.fn().mockResolvedValue([]),
  getActivityCalendarData: vi.fn().mockResolvedValue({ "2026": [] }),
  getJobsActivitySummary: vi.fn().mockResolvedValue({}),
  getJobsActivityForPeriod: vi.fn().mockResolvedValue([]),
  getActivityDataForPeriod: vi.fn().mockResolvedValue({ data: [], keys: [] }),
}));
vi.mock("@/actions/profile.actions", () => ({
  getDefaultResumeId: vi.fn(),
  getResumeById: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/dashboard/AddContactShortcut", () => ({ default: () => null }));
vi.mock("@/components/dashboard/ActivityCalendar", () => ({
  default: () => <div>Activity Calendar</div>,
}));
vi.mock("@/components/dashboard/JobsAppliedCard", () => ({ default: () => null }));
vi.mock("@/components/dashboard/JobsActivityCard", () => ({ default: () => null }));
vi.mock("@/components/dashboard/WeeklyBarChartToggle", () => ({ default: () => null }));
vi.mock("@/components/dashboard/RecentCardToggle", () => ({ default: () => null }));

const review = {
  overall: 85, impact: 80, clarity: 82, atsCompatibility: 78,
  body: "## Strengths\nClear experience.\n\n## Improvements\nAdd measurable outcomes.",
  reviewedAt: "2026-10-01T10:00:00.000Z",
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(getRecentJobs).mockResolvedValue([]);
    vi.mocked(getDefaultResumeId).mockResolvedValue("cv-1");
    vi.mocked(getResumeById).mockResolvedValue({ success: true, data: {
      id: "cv-1", title: "Engineering CV", reviewData: JSON.stringify(review),
    } });
  });

  it("shows recent applications, saved default CV feedback, and the calendar", async () => {
    vi.mocked(getRecentJobs).mockResolvedValue([{
      id: "job-1", appliedDate: new Date("2026-10-07"),
      JobTitle: { label: "Software engineer" }, Company: { label: "Example company" },
      Status: { value: "applied", label: "Applied" }, Location: { label: "Berlin" },
    }]);
    render(await Dashboard());
    expect(screen.getByRole("heading", { name: "Recent applications" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Software engineer/ })).toHaveAttribute("href", "/dashboard/myjobs/job-1");
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/dashboard/myjobs");
    expect(screen.getByText("Engineering CV")).toBeInTheDocument();
    expect(await screen.findByText("85")).toBeInTheDocument();
    expect(screen.getByText(/Add measurable outcomes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Profile" })).toHaveAttribute("href", "/dashboard/profile/resume/cv-1#cv-review");
    expect(screen.getByText("Activity Calendar")).toBeInTheDocument();
  });

  it("guides users with no default CV to Profile without choosing another CV", async () => {
    vi.mocked(getDefaultResumeId).mockResolvedValue(null);
    render(await Dashboard());
    expect(screen.getByText("Choose a default CV in Profile to see its analysis here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profile" })).toHaveAttribute("href", "/dashboard/profile");
    expect(getResumeById).not.toHaveBeenCalled();
  });

  it.each([null, "{bad json", JSON.stringify({ ...review, overall: 300 }), JSON.stringify({ ...review, body: 123 })])(
    "shows an unavailable review state without inventing a score: %s", async (reviewData) => {
      vi.mocked(getResumeById).mockResolvedValue({ success: true, data: { id: "cv-1", title: "Engineering CV", reviewData } });
      render(await Dashboard());
      expect(screen.getByText("No saved analysis yet.")).toBeInTheDocument();
      expect(screen.queryByText("85")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open in Profile" })).toHaveAttribute("href", "/dashboard/profile/resume/cv-1");
    },
  );

  it("keeps applications and the calendar available when the CV read fails", async () => {
    vi.mocked(getDefaultResumeId).mockRejectedValue(new Error("Unavailable"));
    render(await Dashboard());
    expect(screen.getByText("CV analysis is unavailable. Try opening Profile." )).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent applications" })).toBeInTheDocument();
    expect(screen.getByText("Activity Calendar")).toBeInTheDocument();
  });

  it("shows an explicit empty applications state", async () => {
    render(await Dashboard());
    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first application" })).toHaveAttribute("href", "/dashboard/myjobs?add-job=true");
  });
});
