import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import Header from "@/components/Header";
import SettingsSidebar from "@/components/settings/SettingsSidebar";

vi.mock("@/components/SidebarToggle", () => ({ default: () => null }));
vi.mock("@/components/AgentChatTrigger", () => ({ AgentChatTrigger: () => null }));
vi.mock("@/components/PageBreadcrumbs", () => ({ default: () => null }));

test("the mobile menu exposes Settings and closes when it is selected", async () => {
  const user = userEvent.setup();
  render(await Header());
  await user.click(screen.getByRole("button", { name: "Toggle Menu" }));
  const settings = screen.getByRole("link", { name: "Settings" });
  expect(settings).toHaveAttribute("href", "/dashboard/settings");
  await user.click(settings);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("Appearance is accessible in settings navigation", async () => {
  const onSectionChange = vi.fn();
  render(<SettingsSidebar activeSection="ai-provider" onSectionChange={onSectionChange} />);
  await userEvent.click(screen.getByRole("button", { name: "Appearance" }));
  expect(onSectionChange).toHaveBeenCalledWith("appearance");
});
