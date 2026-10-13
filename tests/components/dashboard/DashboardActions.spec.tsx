import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardActions from "@/components/dashboard/DashboardActions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/dashboard/AddContactShortcut", () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => open ? (
    <div role="dialog" aria-label="Add contact"><button onClick={() => onOpenChange(false)}>Close contact</button></div>
  ) : null,
}));

describe("Dashboard actions", () => {
  it("opens the existing Add Job flow", async () => {
    render(<DashboardActions />);
    await userEvent.click(screen.getByRole("button", { name: "Add Job" }));
    expect(push).toHaveBeenCalledWith("/dashboard/myjobs?add-job=true");
  });

  it.each([
    ["Add Automation", "/dashboard/automations?add-automation=true"],
    ["Add Task", "/dashboard/tasks?add-task=true"],
    ["Add Question", "/dashboard/questions?add-question=true"],
    ["Add Activity", "/dashboard/activities?add-activity=true"],
  ])("keeps %s available from More", async (name, href) => {
    render(<DashboardActions />);
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("menuitem", { name }));
    expect(push).toHaveBeenCalledWith(href);
  });

  it("keeps the contact dialog open after the dropdown closes", async () => {
    render(<DashboardActions />);
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Add Contact" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add contact" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close contact" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
